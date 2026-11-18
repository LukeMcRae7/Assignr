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
