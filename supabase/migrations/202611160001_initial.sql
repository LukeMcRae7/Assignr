begin;

create table public.courses (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  payload jsonb not null,
  unique (id, user_id),
  check (length(trim(coalesce(payload->>'name', ''))) between 1 and 120),
  check (payload->>'color' ~ '^#[0-9a-fA-F]{6}$')
);

create function public.valid_weekly_rule(rule jsonb) returns boolean language plpgsql stable set search_path = '' as $$
declare day jsonb;
begin
  if rule is null or rule = 'null'::jsonb then return true; end if;
  if jsonb_typeof(rule->'days') is distinct from 'array' or jsonb_array_length(rule->'days') = 0 then return false; end if;
  for day in select * from jsonb_array_elements(rule->'days') loop
    if day::text !~ '^[0-6]$' then return false; end if;
  end loop;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = rule->>'timezone') then return false; end if;
  return coalesce((rule->>'start_date')::date <= (rule->>'end_date')::date
    and (rule->>'start_time') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    and (rule->>'end_time') ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
    and (rule->>'start_time') < (rule->>'end_time'), false);
exception when others then return false;
end;
$$;

create table public.events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  payload jsonb not null,
  course_id uuid generated always as ((payload->>'course_id')::uuid) stored,
  parent_event_id uuid generated always as ((payload->>'parent_event_id')::uuid) stored,
  occurrence_date text generated always as (payload->>'occurrence_date') stored,
  unique (id, user_id),
  foreign key (course_id, user_id) references public.courses(id, user_id),
  foreign key (parent_event_id, user_id) references public.events(id, user_id),
  check (length(trim(coalesce(payload->>'title',''))) between 1 and 180),
  check (coalesce(payload->>'kind' in ('assignment','exam','quiz','lecture','tutorial','seminar','lab','activity'), false)),
  check (jsonb_typeof(payload->'subtasks') = 'array'),
  check (parent_event_id is null or (parent_event_id <> id and occurrence_date ~ '^\d{4}-\d{2}-\d{2}$' and occurrence_date::date is not null and (payload->'recurrence' is null or payload->'recurrence' = 'null'::jsonb))),
  check (public.valid_weekly_rule(payload->'recurrence')),
  check (coalesce((payload->>'cancelled')::boolean, false) or
    case when payload->'recurrence' is not null and payload->'recurrence' <> 'null'::jsonb then payload->>'starts_at' is null and payload->>'due_at' is null
    when payload->>'due_at' is not null then payload->>'starts_at' is null and payload->>'ends_at' is null and (payload->>'due_at')::timestamptz is not null
    else payload->>'starts_at' is not null and payload->>'ends_at' is not null and (payload->>'ends_at')::timestamptz > (payload->>'starts_at')::timestamptz end),
  check (payload->>'kind' <> 'assignment' or payload->>'due_at' is not null)
);

create unique index events_one_override_per_date on public.events(user_id, parent_event_id, occurrence_date) where deleted_at is null and parent_event_id is not null;
create index events_user_course on public.events(user_id, course_id);
create index courses_user on public.courses(user_id);

create table public.preferences (
  id uuid primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  payload jsonb not null,
  check (id = user_id),
  check (coalesce(payload->>'theme' in ('system','light','dark'), false))
);

create table public.mutation_receipts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  result jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;
alter table public.events enable row level security;
alter table public.preferences enable row level security;
alter table public.mutation_receipts enable row level security;
create policy own_courses on public.courses for select to authenticated using ((select auth.uid()) = user_id);
create policy own_events on public.events for select to authenticated using ((select auth.uid()) = user_id);
create policy own_preferences on public.preferences for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.courses, public.events, public.preferences, public.mutation_receipts from anon, authenticated;
grant select on public.courses, public.events, public.preferences to authenticated;

create function public.apply_change(p_table text, p_record jsonb, p_expected_version integer, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  record_id uuid := (p_record->>'id')::uuid;
  existing_version integer;
  result jsonb;
begin
  if owner_id is null or (p_record->>'user_id')::uuid is distinct from owner_id then raise exception 'Account mismatch' using errcode = '42501'; end if;
  if p_table not in ('courses','events','preferences') or record_id is null or p_mutation_id is null or p_expected_version is null or p_expected_version < 0 then raise exception 'Invalid mutation' using errcode = '22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || p_table || record_id::text, 0));
  select r.result into result from public.mutation_receipts r where r.id = p_mutation_id and r.user_id = owner_id;
  if found then return result; end if;
  execute pg_catalog.format('select version from public.%I where id = $1 and user_id = $2 for update', p_table) into existing_version using record_id, owner_id;
  if coalesce(existing_version, 0) <> p_expected_version then raise exception 'Changed on another device' using errcode = '40001'; end if;
  execute pg_catalog.format('insert into public.%I as item (id,user_id,version,deleted_at,payload)
    values ($1,$2,$3,$4,$5) on conflict(id) do update set version=excluded.version, deleted_at=excluded.deleted_at, payload=excluded.payload
    where item.user_id = $2 returning to_jsonb(item)', p_table)
    into result using record_id, owner_id, coalesce(existing_version,0) + 1, (p_record->>'deleted_at')::timestamptz, p_record - array['id','user_id','version','deleted_at'];
  if result is null then raise exception 'Record unavailable' using errcode = '42501'; end if;
  insert into public.mutation_receipts(id,user_id,result) values (p_mutation_id,owner_id,result);
  return result;
end;
$$;
revoke all on function public.apply_change(text,jsonb,integer,uuid) from public, anon;
grant execute on function public.apply_change(text,jsonb,integer,uuid) to authenticated;

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.courses, public.events, public.preferences;
  end if;
end $$;

commit;
