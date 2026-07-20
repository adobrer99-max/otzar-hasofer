import { describe, it, expect } from "vitest";
import { runSync, type LocalStoreAdapter } from "./sync";
import type { SyncQueueEntry } from "../storage/db";
import type {
  CloudTransport,
  PullResult,
  RemoteDelete,
  RemoteRecord,
} from "./transport";

type Rec = { id: string } & Record<string, unknown>;

function makeLocal(seed?: {
  stores?: Partial<Record<SyncQueueEntry["store"], Rec[]>>;
  queue?: SyncQueueEntry[];
  state?: Record<string, unknown>;
}) {
  const stores = new Map<string, Map<string, Rec>>();
  for (const name of ["participants", "heraldLayers", "lifeCycleEvents", "commentaries", "unions", "contentDrafts"]) {
    stores.set(name, new Map((seed?.stores?.[name as SyncQueueEntry["store"]] ?? []).map((r) => [r.id, r])));
  }
  let queue: SyncQueueEntry[] = [...(seed?.queue ?? [])];
  const state = new Map(Object.entries(seed?.state ?? {}));
  const adapter: LocalStoreAdapter = {
    async getAll(store) {
      return Array.from(stores.get(store)!.values());
    },
    async put(store, record) {
      stores.get(store)!.set(record.id as string, record as Rec);
    },
    async remove(store, id) {
      stores.get(store)!.delete(id);
    },
    async drainQueue() {
      const drained = queue;
      queue = [];
      return drained;
    },
    async pendingIds() {
      return new Set(queue.map((e) => e.id));
    },
    async getState(key) {
      return state.get(key);
    },
    async setState(key, value) {
      state.set(key, value);
    },
  };
  return {
    adapter,
    stores,
    state,
    enqueueLate: (e: SyncQueueEntry) => queue.push(e),
  };
}

function makeTransport(pull?: Partial<PullResult>) {
  const pushedRecords: RemoteRecord[] = [];
  const pushedDeletes: RemoteDelete[] = [];
  const transport: CloudTransport = {
    async pushRecords(records) {
      pushedRecords.push(...records);
    },
    async pushDeletes(deletes) {
      pushedDeletes.push(...deletes);
    },
    async pullSince() {
      return {
        records: pull?.records ?? [],
        deletes: pull?.deletes ?? [],
        serverNow: pull?.serverNow ?? "2026-07-04T12:00:00Z",
      };
    },
  };
  return { transport, pushedRecords, pushedDeletes };
}

describe("runSync", () => {
  it("performs a full push of every store on first link", async () => {
    const { adapter } = makeLocal({
      stores: {
        participants: [{ id: "p1", displayName: "A" }],
        heraldLayers: [{ id: "l1" }, { id: "l2" }],
        commentaries: [{ id: "c1" }],
      },
    });
    const { transport, pushedRecords } = makeTransport();
    const summary = await runSync(adapter, transport);
    expect(summary.initialPush).toBe(true);
    expect(pushedRecords.map((r) => r.id).sort()).toEqual(["c1", "l1", "l2", "p1"]);
  });

  it("pushes only queued changes after the initial link, deduped last-op-wins", async () => {
    const { adapter } = makeLocal({
      stores: {
        participants: [{ id: "p1", displayName: "A" }],
        commentaries: [{ id: "c1", body: "kept" }],
      },
      queue: [
        { store: "commentaries", id: "c1", op: "put" },
        { store: "commentaries", id: "c1", op: "put" }, // duplicate collapses
        { store: "commentaries", id: "c2", op: "put" },
        { store: "commentaries", id: "c2", op: "delete" }, // delete wins
      ],
      state: { initialPushDone: true },
    });
    const { transport, pushedRecords, pushedDeletes } = makeTransport();
    const summary = await runSync(adapter, transport);
    expect(summary.initialPush).toBe(false);
    // p1 is NOT pushed (not queued); c1 pushed once; c2 becomes a delete.
    expect(pushedRecords.map((r) => r.id)).toEqual(["c1"]);
    expect(pushedDeletes).toEqual([{ store: "commentaries", id: "c2" }]);
  });

  it("applies pulled records and tombstones locally and advances the server watermark", async () => {
    const { adapter, stores, state } = makeLocal({
      stores: { participants: [{ id: "gone", displayName: "Old" }] },
      state: { initialPushDone: true },
    });
    const { transport } = makeTransport({
      records: [{ store: "participants", id: "p9", data: { id: "p9", displayName: "New" } }],
      deletes: [{ store: "participants", id: "gone" }],
      serverNow: "2026-08-01T00:00:00Z",
    });
    const summary = await runSync(adapter, transport);
    expect(summary.pulledRecords).toBe(1);
    expect(summary.pulledDeletes).toBe(1);
    expect(stores.get("participants")!.has("p9")).toBe(true);
    expect(stores.get("participants")!.has("gone")).toBe(false);
    expect(state.get("lastPullAt")).toBe("2026-08-01T00:00:00Z");
  });

  it("does not let the same run's pull clobber a record it just pushed (echo/older copy)", async () => {
    const { adapter, stores, enqueueLate } = makeLocal({
      stores: { commentaries: [{ id: "c1", body: "local edit" }] },
      state: { initialPushDone: true },
    });
    const { transport, pushedRecords } = makeTransport({
      records: [{ store: "commentaries", id: "c1", data: { id: "c1", body: "remote edit" } }],
    });
    enqueueLate({ store: "commentaries", id: "c1", op: "put" });
    await runSync(adapter, transport);
    // The queued local edit was pushed (newest by server time)…
    expect(pushedRecords.map((r) => r.id)).toEqual(["c1"]);
    // …so the concurrent remote copy in this pull must not overwrite it.
    expect(stores.get("commentaries")!.get("c1")!.body).toBe("local edit");
  });

  it("skips pulled changes for records that turn dirty mid-run (local wins until pushed)", async () => {
    const { adapter, stores, enqueueLate } = makeLocal({
      stores: { commentaries: [{ id: "c1", body: "local edit" }] },
      state: { initialPushDone: true },
    });
    // A transport whose pull ALSO simulates a user write landing mid-sync.
    const transport: CloudTransport = {
      async pushRecords() {},
      async pushDeletes() {},
      async pullSince() {
        enqueueLate({ store: "commentaries", id: "c1", op: "put" });
        return {
          records: [{ store: "commentaries", id: "c1", data: { id: "c1", body: "remote edit" } }],
          deletes: [],
          serverNow: "2026-07-04T12:00:00Z",
        };
      },
    };
    await runSync(adapter, transport);
    expect(stores.get("commentaries")!.get("c1")!.body).toBe("local edit");
  });

  it("syncs the unions store like any other (push queued, apply pulled)", async () => {
    const { adapter, stores } = makeLocal({
      stores: { unions: [{ id: "u1", partnerAId: "a", partnerBId: "b" }] },
      queue: [{ store: "unions", id: "u1", op: "put" }],
      state: { initialPushDone: true },
    });
    const { transport, pushedRecords } = makeTransport({
      records: [
        { store: "unions", id: "u2", data: { id: "u2", partnerAId: "c", partnerBId: "d" } },
      ],
    });
    await runSync(adapter, transport);
    expect(pushedRecords.map((r) => r.store)).toEqual(["unions"]);
    expect(stores.get("unions")!.has("u2")).toBe(true);
  });

  it("syncs contentDrafts by their key-as-id (push queued, pull applies, delete removes)", async () => {
    const draft = {
      id: "letters::aleph",
      key: "letters::aleph",
      fields: { keyword: "Rewritten" },
      updatedAt: "2026-07-01T00:00:00Z",
    };
    const { adapter, stores } = makeLocal({
      stores: { contentDrafts: [draft] },
      queue: [{ store: "contentDrafts", id: "letters::aleph", op: "put" }],
      state: { initialPushDone: true },
    });
    const { transport, pushedRecords } = makeTransport({
      records: [
        {
          store: "contentDrafts",
          id: "festivals::shabbat",
          data: {
            id: "festivals::shabbat",
            key: "festivals::shabbat",
            fields: { gesture: "Rest" },
            updatedAt: "2026-07-02T00:00:00Z",
          },
        },
      ],
      deletes: [{ store: "contentDrafts", id: "gone::draft" }],
    });
    stores.get("contentDrafts")!.set("gone::draft", { id: "gone::draft", key: "gone::draft" });
    await runSync(adapter, transport);
    // The queued local draft was pushed with its full record…
    expect(pushedRecords).toEqual([
      { store: "contentDrafts", id: "letters::aleph", data: draft },
    ]);
    // …the pulled draft landed locally, and the tombstone removed by key.
    expect(stores.get("contentDrafts")!.has("festivals::shabbat")).toBe(true);
    expect(stores.get("contentDrafts")!.has("gone::draft")).toBe(false);
  });

  it("includes contentDrafts in the initial full push", async () => {
    const { adapter } = makeLocal({
      stores: {
        contentDrafts: [
          { id: "letters::bet", key: "letters::bet", fields: {}, updatedAt: "x" },
        ],
      },
    });
    const { transport, pushedRecords } = makeTransport();
    await runSync(adapter, transport);
    expect(pushedRecords.map((r) => r.id)).toContain("letters::bet");
  });

  it("is idempotent when there is nothing to do", async () => {
    const { adapter } = makeLocal({ state: { initialPushDone: true, lastPullAt: "2026-07-01T00:00:00Z" } });
    const { transport, pushedRecords, pushedDeletes } = makeTransport();
    const summary = await runSync(adapter, transport);
    expect(pushedRecords).toHaveLength(0);
    expect(pushedDeletes).toHaveLength(0);
    expect(summary.pulledRecords).toBe(0);
  });
});
