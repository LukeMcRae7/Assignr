import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("Postgres migration, access policies, and mutation RPC", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public, auth to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;`);
    await db.exec(
      await readFile("supabase/migrations/202611160001_initial.sql", "utf8"),
    );
    await db.exec(
      await readFile("supabase/migrations/202611170001_semesters.sql", "utf8"),
    );
    const alice = randomUUID(),
      bob = randomUUID(),
      courseId = randomUUID();
    await db.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
    async function identity(user: string) {
      await db.exec("set role authenticated");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        user,
      ]);
    }
    const course = {
      id: courseId,
      user_id: alice,
      version: 0,
      name: "Data Structures",
      color: "#485BC4",
      deleted_at: null,
    };
    const mutationId = randomUUID();
    await identity(alice);
    const apply = (
      record: object,
      version = 0,
      mutation = randomUUID(),
      table = "courses",
    ) =>
      db.query<{ result: { version: number } }>(
        "select public.apply_change($1,$2::jsonb,$3,$4) as result",
        [table, JSON.stringify(record), version, mutation],
      );
    await t.test(
      "owned rows can be created and retries are idempotent",
      async () => {
        const result = await apply(course, 0, mutationId);
        assert.equal(result.rows[0].result.version, 1);
        const retry = await apply(course, 0, mutationId);
        assert.equal(retry.rows[0].result.version, 1);
        assert.equal((await db.query("select * from courses")).rows.length, 1);
      },
    );
    await t.test(
      "custom event types and their filters survive a sync round trip",
      async () => {
        const id = randomUUID();
        await apply(
          {
            id,
            user_id: alice,
            course_id: courseId,
            title: "Week one",
            kind: "assignment",
            custom_type: "Reading",
            due_at: "2026-11-20T12:00:00.000Z",
            subtasks: [],
            cancelled: false,
          },
          0,
          randomUUID(),
          "events",
        );
        await apply(
          {
            id: alice,
            user_id: alice,
            theme: "system",
            custom_type_visibility: { "assignments:reading": false },
          },
          0,
          randomUUID(),
          "preferences",
        );
        const event = await db.query<{ label: string }>(
          "select payload->>'custom_type' as label from events where id = $1",
          [id],
        );
        assert.equal(event.rows[0].label, "Reading");
        const pref = await db.query<{ visible: boolean }>(
          "select (payload->'custom_type_visibility'->>'assignments:reading')::boolean as visible from preferences where id = $1",
          [alice],
        );
        assert.equal(pref.rows[0].visible, false);
      },
    );
    await t.test("stale edits cannot overwrite newer data", async () => {
      await assert.rejects(
        apply({ ...course, name: "Stale" }),
        (error: { code: string }) => error.code === "40001",
      );
    });
    await t.test(
      "another account cannot read rows or forge their owner",
      async () => {
        await identity(bob);
        assert.equal((await db.query("select * from courses")).rows.length, 0);
        await assert.rejects(
          apply(course),
          (error: { code: string }) => error.code === "42501",
        );
        await assert.rejects(
          db.query("update courses set version=99"),
          (error: { code: string }) => error.code === "42501",
        );
      },
    );
    await t.test(
      "cross-account course relationships are rejected",
      async () => {
        const event = {
          id: randomUUID(),
          user_id: bob,
          course_id: courseId,
          title: "Forbidden link",
          kind: "assignment",
          due_at: "2026-11-20T12:00:00.000Z",
          subtasks: [],
          cancelled: false,
        };
        await assert.rejects(
          apply(event, 0, randomUUID(), "events"),
          (error: { code: string }) => error.code === "23503",
        );
      },
    );
    await t.test(
      "semesters enforce ownership, valid dates, stable timezone, and safe deletion",
      async () => {
        await identity(alice);
        const semester = {
          id: randomUUID(),
          user_id: alice,
          version: 0,
          deleted_at: null,
          name: "Fall 2026",
          start_date: "2026-09-01",
          end_date: "2026-12-01",
          timezone: "America/Vancouver",
        };
        const receipt = randomUUID();
        await apply(semester, 0, receipt, "semesters");
        assert.equal(
          (await apply(semester, 0, receipt, "semesters")).rows[0].result
            .version,
          1,
        );
        await assert.rejects(
          apply(
            { ...semester, id: randomUUID(), end_date: "2026-02-30" },
            0,
            randomUUID(),
            "semesters",
          ),
          (e: { code: string }) => e.code === "23514",
        );
        await assert.rejects(
          apply(
            { ...semester, timezone: "Asia/Tokyo" },
            1,
            randomUUID(),
            "semesters",
          ),
          (e: { code: string }) => e.code === "23514",
        );
        await apply({ ...course, semester_id: semester.id }, 1);
        await assert.rejects(
          apply(
            { ...semester, deleted_at: new Date().toISOString() },
            1,
            randomUUID(),
            "semesters",
          ),
          (e: { code: string }) => e.code === "23514",
        );
        await assert.rejects(
          apply({ ...semester, name: "Stale" }, 0, randomUUID(), "semesters"),
          (e: { code: string }) => e.code === "40001",
        );
        await identity(bob);
        assert.equal(
          (await db.query("select * from semesters")).rows.length,
          0,
        );
        await assert.rejects(
          apply({
            ...course,
            id: randomUUID(),
            user_id: bob,
            semester_id: semester.id,
          }),
          (e: { code: string }) => e.code === "23503",
        );
        await assert.rejects(
          apply(semester, 1, randomUUID(), "semesters"),
          (e: { code: string }) => e.code === "42501",
        );
        await identity(alice);
        await apply(
          {
            ...course,
            semester_id: semester.id,
            deleted_at: new Date().toISOString(),
          },
          2,
        );
        await apply(
          { ...semester, deleted_at: new Date().toISOString() },
          1,
          randomUUID(),
          "semesters",
        );
        await assert.rejects(
          apply({ ...course, id: randomUUID(), semester_id: semester.id }),
          (e: { code: string }) => e.code === "23503",
        );
      },
    );
    await t.test("anonymous requests cannot write data", async () => {
      await db.exec("set role anon");
      await assert.rejects(
        apply(course),
        (error: { code: string }) => error.code === "42501",
      );
    });
  } finally {
    await db.close();
  }
});
