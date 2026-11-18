begin;

create function public.valid_semester(value jsonb) returns boolean language plpgsql stable set search_path = '' as $$
begin
  return coalesce(length(trim(value->>'name')) between 1 and 120
    and value->>'start_date' ~ '^\d{4}-\d{2}-\d{2}$'
    and value->>'end_date' ~ '^\d{4}-\d{2}-\d{2}$'
    and (value->>'start_date')::date <= (value->>'end_date')::date
    and exists(select 1 from pg_catalog.pg_timezone_names where name = value->>'timezone'), false);
exception when others then return false;
end;
$$;
create table public.semesters (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  version integer not null default 1 check (version > 0),
  deleted_at timestamptz,
  payload jsonb not null check (public.valid_semester(payload)),
  unique (id, user_id)
);
create index semesters_user on public.semesters(user_id);
alter table public.semesters enable row level security;
create policy own_semesters on public.semesters for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.semesters from anon, authenticated;
grant select on public.semesters to authenticated;
alter table public.courses add column semester_id uuid generated always as ((payload->>'semester_id')::uuid) stored;
alter table public.courses add constraint courses_semester_owner foreign key (semester_id, user_id) references public.semesters(id, user_id);
create index courses_user_semester on public.courses(user_id, semester_id);

create function public.guard_semester() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.payload->>'timezone' is distinct from old.payload->>'timezone' then
    raise exception 'A semester keeps its original timezone' using errcode = '23514';
  end if;
  if old.deleted_at is null and new.deleted_at is not null and exists (
    select 1 from public.courses where semester_id = old.id and user_id = old.user_id and deleted_at is null
  ) then raise exception 'Move or delete the courses in this semester first' using errcode = '23514'; end if;
  return new;
end;
$$;
create trigger guard_semester before update on public.semesters for each row execute function public.guard_semester();
create function public.guard_course_semester() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.deleted_at is null and new.payload->>'semester_id' is not null then
    perform 1 from public.semesters where id = (new.payload->>'semester_id')::uuid and user_id = new.user_id and deleted_at is null for update;
    if not found then raise exception 'Semester unavailable' using errcode = '23503'; end if;
  end if;
  return new;
end;
$$;
create trigger guard_course_semester before insert or update on public.courses for each row execute function public.guard_course_semester();

create or replace function public.apply_change(p_table text, p_record jsonb, p_expected_version integer, p_mutation_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  record_id uuid := (p_record->>'id')::uuid;
  existing_version integer;
  result jsonb;
begin
  if owner_id is null or (p_record->>'user_id')::uuid is distinct from owner_id then raise exception 'Account mismatch' using errcode = '42501'; end if;
  if p_table not in ('semesters','courses','events','preferences') or record_id is null or p_mutation_id is null or p_expected_version is null or p_expected_version < 0 then raise exception 'Invalid mutation' using errcode = '22023'; end if;
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

do $$ begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.semesters;
  end if;
end $$;
commit;
