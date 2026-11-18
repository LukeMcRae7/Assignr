import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Course, Entity, Snapshot } from "../src/domain/model";
import { ConflictError, Remote, Storage, StudyStore } from "../src/data/store";

class MemoryStorage implements Storage {
  values = new Map<string, string>();
  fail = false;
  async getItem(key: string) {
    return this.values.get(key) || null;
  }
  async setItem(key: string, value: string) {
    if (this.fail) throw new Error("Storage full");
    this.values.set(key, value);
  }
}
function course(user_id = "alice"): Course {
  return {
    id: randomUUID(),
    user_id,
    version: 0,
    deleted_at: null,
    name: "Data Structures",
    semester_id: null,
    code: "CMPT 225",
    professor: "",
    website: "",
    color: "#485BC4",
    icon: "server",
    position: 0,
  };
}
class FakeRemote implements Remote {
  snapshot: Snapshot = {
    semesters: [],
    courses: [],
    events: [],
    preferences: [],
  };
  receipts = new Map<string, Entity>();
  fail = false;
  loseAck = false;
  async pull() {
    if (this.fail) throw new Error("Network unavailable");
    return structuredClone(this.snapshot);
  }
  async get(table: keyof Snapshot, id: string) {
    return this.snapshot[table].find((e) => e.id === id)!;
  }
  async apply(m: Parameters<Remote["apply"]>[0]) {
    if (this.fail) throw new Error("Network unavailable");
    if (this.receipts.has(m.id))
      return structuredClone(this.receipts.get(m.id)!);
    const current = this.snapshot[m.table].find((e) => e.id === m.record.id);
    if ((current?.version || 0) !== m.expected_version)
      throw new ConflictError();
    const saved = { ...m.record, version: m.expected_version + 1 };
    Object.assign(this.snapshot, {
      [m.table]: [
        ...this.snapshot[m.table].filter((e) => e.id !== saved.id),
        saved,
      ],
    });
    this.receipts.set(m.id, saved);
    if (this.loseAck) {
      this.loseAck = false;
      throw new Error("Response lost");
    }
    return structuredClone(saved);
  }
}
async function settled(store: StudyStore) {
  for (let i = 0; i < 100; i++) {
    await new Promise((r) => setTimeout(r, 5));
    if (store.getState().status !== "syncing") return;
  }
  throw new Error("Sync did not settle");
}
test("v1 cache migration preserves unsynced records and mutation identities", async () => {
  const disk = new MemoryStorage();
  const c = course();
  const queued = {
    id: randomUUID(),
    table: "courses",
    record: c,
    expected_version: 0,
  };
  disk.values.set(
    "assignr:v1:alice",
    JSON.stringify({
      schema: 1,
      snapshot: { courses: [c], events: [], preferences: [] },
      queue: [queued],
    }),
  );
  const store = new StudyStore("alice", disk, randomUUID, new FakeRemote());
  store.setOnline(false);
  await store.initialize();
  assert.equal(store.getState().schema, 2);
  assert.deepEqual(store.getState().snapshot.semesters, []);
  assert.deepEqual(store.getState().queue, [queued]);
  assert.equal(store.getState().snapshot.courses[0].id, c.id);
  assert.equal(JSON.parse(disk.values.get("assignr:v1:alice")!).schema, 2);
});

test("offline semester and course creation replay in dependency order after restart", async () => {
  const disk = new MemoryStorage();
  const remote = new FakeRemote();
  const store = new StudyStore("alice", disk, randomUUID, remote);
  store.setOnline(false);
  await store.initialize();
  const semester = {
    ...course(),
    name: "Fall 2026",
    start_date: "2026-09-01",
    end_date: "2026-12-01",
    timezone: "America/Vancouver",
  };
  const c = { ...course(), semester_id: semester.id };
  await store.commit([
    { table: "semesters", record: semester },
    { table: "courses", record: c },
  ]);
  assert.deepEqual(
    store.getState().queue.map((m) => m.table),
    ["semesters", "courses"],
  );
  store.dispose();
  const resumed = new StudyStore("alice", disk, randomUUID, remote);
  await resumed.initialize();
  await settled(resumed);
  assert.equal(resumed.getState().queue.length, 0);
  assert.equal(
    remote.snapshot.courses[0].semester_id,
    remote.snapshot.semesters[0].id,
  );
});
test("local writes survive restart and stay scoped to their account", async () => {
  const disk = new MemoryStorage();
  const a = new StudyStore("alice", disk, randomUUID);
  await a.initialize();
  await a.commit([{ table: "courses", record: course() }]);
  const restored = new StudyStore("alice", disk, randomUUID);
  await restored.initialize();
  assert.equal(restored.getState().snapshot.courses.length, 1);
  const b = new StudyStore("bob", disk, randomUUID);
  await b.initialize();
  assert.equal(b.getState().snapshot.courses.length, 0);
  await assert.rejects(
    b.commit([{ table: "courses", record: course() }]),
    /another account/,
  );
});
test("failed disk writes never falsely report a saved change", async () => {
  const disk = new MemoryStorage();
  const store = new StudyStore("alice", disk, randomUUID);
  await store.initialize();
  disk.fail = true;
  await assert.rejects(
    store.commit([{ table: "courses", record: course() }]),
    /Storage full/,
  );
  assert.equal(store.getState().snapshot.courses.length, 0);
});
test("offline edits replay in order after restart without overwriting newer edits", async () => {
  const disk = new MemoryStorage();
  const remote = new FakeRemote();
  const a = new StudyStore("alice", disk, randomUUID, remote);
  a.setOnline(false);
  await a.initialize();
  const c = course();
  await a.commit([{ table: "courses", record: c }]);
  await a.commit([
    { table: "courses", record: { ...c, name: "Updated course" } },
  ]);
  a.dispose();
  const b = new StudyStore("alice", disk, randomUUID, remote);
  await b.initialize();
  await settled(b);
  assert.equal(remote.snapshot.courses[0].name, "Updated course");
  assert.equal(remote.snapshot.courses[0].version, 2);
  assert.equal(b.getState().queue.length, 0);
});
test("a lost server acknowledgment can safely retry the same mutation", async () => {
  const disk = new MemoryStorage();
  const remote = new FakeRemote();
  const store = new StudyStore("alice", disk, randomUUID, remote);
  await store.initialize();
  await settled(store);
  remote.loseAck = true;
  await store.commit([{ table: "courses", record: course() }]);
  await settled(store);
  assert.equal(store.getState().queue.length, 1);
  await store.sync();
  assert.equal(store.getState().queue.length, 0);
  assert.equal(remote.snapshot.courses[0].version, 1);
});
test("conflicts retain local edits until an explicit resolution", async () => {
  const disk = new MemoryStorage();
  const remote = new FakeRemote();
  const c = { ...course(), version: 1 };
  remote.snapshot.courses = [c];
  const store = new StudyStore("alice", disk, randomUUID, remote);
  await store.initialize();
  await settled(store);
  store.setOnline(false);
  await store.commit([{ table: "courses", record: { ...c, name: "Mine" } }]);
  remote.snapshot.courses[0] = { ...c, name: "Other device", version: 2 };
  store.setOnline(true);
  await settled(store);
  assert.equal(store.getState().status, "conflict");
  assert.equal(store.getState().snapshot.courses[0].name, "Mine");
  await store.resolveConflict("mine");
  await settled(store);
  assert.equal(remote.snapshot.courses[0].name, "Mine");
  assert.equal(remote.snapshot.courses[0].version, 3);
});

test("concurrent local updates read the most recent persisted record", async () => {
  const disk = new MemoryStorage();
  const store = new StudyStore("alice", disk, randomUUID);
  await store.initialize();
  const c = course();
  await store.commit([{ table: "courses", record: c }]);
  await Promise.all([
    store.commit((snapshot) => [
      {
        table: "courses",
        record: { ...snapshot.courses[0], name: "Updated name" },
      },
    ]),
    store.commit((snapshot) => [
      {
        table: "courses",
        record: { ...snapshot.courses[0], professor: "Professor" },
      },
    ]),
  ]);
  assert.equal(store.getState().snapshot.courses[0].name, "Updated name");
  assert.equal(store.getState().snapshot.courses[0].professor, "Professor");
});

test("an edit arriving during a server read is queued and synchronized", async () => {
  const disk = new MemoryStorage();
  const remote = new FakeRemote();
  const store = new StudyStore("alice", disk, randomUUID, remote);
  await store.initialize();
  await settled(store);
  let release!: () => void;
  let started!: () => void;
  const reading = new Promise<void>((r) => {
    started = r;
  });
  const gate = new Promise<void>((r) => {
    release = r;
  });
  const original = remote.pull.bind(remote);
  remote.pull = async () => {
    const snapshot = await original();
    started();
    await gate;
    remote.pull = original;
    return snapshot;
  };
  const sync = store.sync();
  await reading;
  await store.commit([{ table: "courses", record: course() }]);
  release();
  await sync;
  await settled(store);
  assert.equal(store.getState().queue.length, 0);
  assert.equal(remote.snapshot.courses.length, 1);
});
