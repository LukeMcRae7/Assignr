import { Entity, Mutation, Snapshot, Table } from "../domain/model";

export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export interface Remote {
  pull(): Promise<Snapshot>;
  apply(mutation: Mutation): Promise<Entity>;
  get(table: Table, id: string): Promise<Entity>;
}
export class ConflictError extends Error {}
interface Cache {
  schema: 1;
  snapshot: Snapshot;
  queue: Mutation[];
}
export interface StoreState extends Cache {
  ready: boolean;
  status: "local" | "synced" | "syncing" | "offline" | "error" | "conflict";
  error: string | null;
  conflict: { mutation: Mutation; remote: Entity } | null;
}
const empty = (): Snapshot => ({ courses: [], events: [], preferences: [] });

function put(snapshot: Snapshot, table: Table, record: Entity): Snapshot {
  return {
    ...snapshot,
    [table]: [...snapshot[table].filter((r) => r.id !== record.id), record],
  };
}

export class StudyStore {
  private state: StoreState = {
    schema: 1,
    snapshot: empty(),
    queue: [],
    ready: false,
    status: "local",
    error: null,
    conflict: null,
  };
  private listeners = new Set<() => void>();
  private writes: Promise<unknown> = Promise.resolve();
  private syncing = false;
  private disposed = false;
  private online = true;
  private readonly key: string;
  constructor(
    private userId: string,
    private storage: Storage,
    private uuid: () => string,
    private remote?: Remote,
  ) {
    this.key = `assignr:v1:${userId}`;
  }
  getState = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<StoreState>) {
    if (this.disposed) return;
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  private atomic(update: (cache: Cache) => Cache): Promise<void> {
    const task = this.writes.then(async () => {
      if (this.disposed) return;
      const next = update(this.state);
      await this.storage.setItem(this.key, JSON.stringify(next));
      this.publish({ snapshot: next.snapshot, queue: next.queue });
    });
    this.writes = task.catch(() => {});
    return task;
  }
  async initialize() {
    try {
      const raw = await this.storage.getItem(this.key);
      if (raw) {
        const cache = JSON.parse(raw) as Cache;
        if (
          cache.schema !== 1 ||
          !Array.isArray(cache.snapshot?.courses) ||
          !Array.isArray(cache.snapshot?.events) ||
          !Array.isArray(cache.snapshot?.preferences) ||
          !Array.isArray(cache.queue)
        )
          throw new Error(
            "The saved workspace could not be read. Your stored data has been preserved.",
          );
        this.publish({ snapshot: cache.snapshot, queue: cache.queue });
      }
      this.publish({ ready: true, status: this.remote ? "synced" : "local" });
      void this.sync();
    } catch (error) {
      this.publish({ error: String(error), status: "error" });
    }
  }
  async commit(
    input:
      | { table: Table; record: Entity }[]
      | ((snapshot: Snapshot) => { table: Table; record: Entity }[]),
  ) {
    if (!this.state.ready) throw new Error("Your workspace is still loading.");
    await this.atomic((cache) => {
      const changes =
        typeof input === "function" ? input(cache.snapshot) : input;
      if (changes.some((c) => c.record.user_id !== this.userId))
        throw new Error("This record belongs to another account.");
      let snapshot = cache.snapshot;
      const queue = [...cache.queue];
      for (const { table, record } of changes) {
        snapshot = put(snapshot, table, record);
        if (this.remote)
          queue.push({
            id: this.uuid(),
            table,
            record,
            expected_version: record.version,
          });
      }
      return { schema: 1, snapshot, queue };
    });
    void this.sync();
  }
  setOnline(online: boolean) {
    this.online = online;
    if (!online && this.remote) this.publish({ status: "offline" });
    if (online) void this.sync();
  }
  async sync() {
    if (
      !this.remote ||
      this.syncing ||
      this.disposed ||
      !this.state.ready ||
      this.state.conflict
    )
      return;
    if (!this.online) {
      this.publish({ status: "offline" });
      return;
    }
    this.syncing = true;
    this.publish({ status: "syncing", error: null });
    try {
      await this.writes;
      while (this.state.queue.length && !this.disposed && this.online) {
        const mutation = this.state.queue[0];
        let saved: Entity;
        try {
          saved = await this.remote.apply(mutation);
        } catch (error) {
          if (error instanceof ConflictError) {
            const remote = await this.remote.get(
              mutation.table,
              mutation.record.id,
            );
            this.publish({
              status: "conflict",
              conflict: { mutation, remote },
            });
            return;
          }
          throw error;
        }
        await this.atomic((cache) => {
          const queue = cache.queue
            .filter((m) => m.id !== mutation.id)
            .map((m) =>
              m.table === mutation.table && m.record.id === saved.id
                ? {
                    ...m,
                    expected_version: saved.version,
                    record: { ...m.record, version: saved.version },
                  }
                : m,
            );
          const pending = queue
            .filter(
              (m) => m.table === mutation.table && m.record.id === saved.id,
            )
            .at(-1);
          return {
            schema: 1,
            queue,
            snapshot: put(
              cache.snapshot,
              mutation.table,
              pending?.record || saved,
            ),
          };
        });
      }
      if (this.disposed || !this.online) return;
      const server = await this.remote.pull();
      await this.atomic((cache) => {
        let snapshot = server;
        for (const m of cache.queue)
          snapshot = put(snapshot, m.table, m.record);
        return { schema: 1, snapshot, queue: cache.queue };
      });
      this.publish({ status: this.online ? "synced" : "offline" });
    } catch (error) {
      this.publish({
        status: this.online ? "error" : "offline",
        error:
          error instanceof Error
            ? error.message
            : "Could not sync. Your changes are saved on this device.",
      });
    } finally {
      this.syncing = false;
      // A local edit may have arrived while the server snapshot was being read.
      if (
        !this.disposed &&
        this.state.status === "synced" &&
        this.state.queue.length
      )
        void this.sync();
    }
  }
  async resolveConflict(choice: "mine" | "remote") {
    const conflict = this.state.conflict;
    if (!conflict) return;
    await this.atomic((cache) => {
      const same = (m: Mutation) =>
        m.table === conflict.mutation.table &&
        m.record.id === conflict.remote.id;
      const latest = cache.queue.filter(same).at(-1) || conflict.mutation;
      const queue = cache.queue.filter((m) => !same(m));
      const record =
        choice === "mine"
          ? { ...latest.record, version: conflict.remote.version }
          : conflict.remote;
      if (choice === "mine")
        queue.unshift({
          ...latest,
          id: this.uuid(),
          record,
          expected_version: conflict.remote.version,
        });
      return {
        schema: 1,
        queue,
        snapshot: put(cache.snapshot, conflict.mutation.table, record),
      };
    });
    this.publish({ conflict: null, error: null });
    void this.sync();
  }
  dispose() {
    this.disposed = true;
    this.listeners.clear();
  }
}
