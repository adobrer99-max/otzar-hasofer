import { getSupabase } from "./supabaseClient";
import {
  REMOTE_TABLES,
  SYNC_STORES,
  OWNER_COMPOSITE_STORES,
  type CloudTransport,
  type PullResult,
  type RemoteDelete,
  type RemoteRecord,
} from "./transport";

/**
 * The Supabase implementation of `CloudTransport`, kept in its own module so
 * the SDK only enters the module graph via the dynamic imports in
 * `orchestrator.ts`/`AccountPage.tsx` — an unconfigured deployment never
 * loads it at all.
 */
export class SupabaseTransport implements CloudTransport {
  async pushRecords(records: RemoteRecord[]): Promise<void> {
    const supabase = getSupabase();
    let ownerId: string | undefined;
    for (const store of SYNC_STORES) {
      const stored = records.filter((r) => r.store === store);
      if (stored.length === 0) continue;
      if (OWNER_COMPOSITE_STORES.has(store)) {
        // (owner_id, id) tables: carry owner_id explicitly and name the
        // composite conflict target — draft ids alone aren't globally unique.
        if (!ownerId) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          ownerId = session?.user.id;
          if (!ownerId) throw new Error("No session for the composite-key push.");
        }
        const rows = stored.map((r) => ({
          id: r.id,
          owner_id: ownerId,
          data: r.data,
          deleted_at: null,
        }));
        const { error } = await supabase
          .from(REMOTE_TABLES[store])
          .upsert(rows, { onConflict: "owner_id,id" });
        if (error) throw new Error(`Push to ${REMOTE_TABLES[store]} failed: ${error.message}`);
        continue;
      }
      const rows = stored.map((r) => ({ id: r.id, data: r.data, deleted_at: null }));
      const { error } = await supabase.from(REMOTE_TABLES[store]).upsert(rows);
      if (error) throw new Error(`Push to ${REMOTE_TABLES[store]} failed: ${error.message}`);
    }
  }

  async pushDeletes(deletes: RemoteDelete[]): Promise<void> {
    const supabase = getSupabase();
    const now = new Date().toISOString();
    for (const del of deletes) {
      // Soft-delete tombstone; an update on a row that never reached the
      // cloud simply matches nothing, which is the correct outcome.
      const { error } = await supabase
        .from(REMOTE_TABLES[del.store])
        .update({ deleted_at: now })
        .eq("id", del.id);
      if (error) throw new Error(`Delete in ${REMOTE_TABLES[del.store]} failed: ${error.message}`);
    }
  }

  async pullSince(sinceIso: string | null): Promise<PullResult> {
    const supabase = getSupabase();
    const records: RemoteRecord[] = [];
    const deletes: RemoteDelete[] = [];
    let maxSeen = sinceIso ?? "1970-01-01T00:00:00Z";

    for (const store of SYNC_STORES) {
      let query = supabase
        .from(REMOTE_TABLES[store])
        .select("id, data, updated_at, deleted_at")
        .order("updated_at", { ascending: true });
      if (sinceIso) query = query.gt("updated_at", sinceIso);
      const { data, error } = await query;
      if (error) throw new Error(`Pull from ${REMOTE_TABLES[store]} failed: ${error.message}`);
      for (const row of data ?? []) {
        if (row.updated_at > maxSeen) maxSeen = row.updated_at;
        if (row.deleted_at) {
          deletes.push({ store, id: row.id });
        } else {
          records.push({ store, id: row.id, data: row.data });
        }
      }
    }
    return { records, deletes, serverNow: maxSeen };
  }
}
