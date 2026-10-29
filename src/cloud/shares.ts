/**
 * Share links — publish/read the participant-facing Herald snapshot. Writes
 * are Scribe-only (RLS "own rows"); the anonymous read path is exclusively
 * the `get_shared_herald` RPC, which requires the exact token (the table has
 * no anon select policy, so tokens cannot be enumerated). This module is only
 * ever dynamically imported, like the rest of the cloud.
 */

import type { SharedHeraldPayload } from "../herald/share/sharePayload";

const TABLE = "shared_heralds";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Whether a string even looks like a share token (avoids garbage round-trips). */
export function isShareToken(token: string): boolean {
  return UUID_RE.test(token);
}

export interface ShareInfo {
  token: string;
  /** When the snapshot was last (re)published. */
  updatedAt: string;
  /** When the link was first minted (absent on a pre-expiry database). */
  createdAt?: string;
  expiresAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  /**
   * The database predates the expiry/views block in schema.sql, so those
   * fields are defaults and the expiry controls cannot work yet.
   */
  legacy: boolean;
}

const COLUMNS = "token, updated_at, created_at, expires_at, last_viewed_at, view_count";
const LEGACY_COLUMNS = "token, updated_at";
/** Postgres "undefined column" — the R38 migration hasn't been run. */
const UNDEFINED_COLUMN = "42703";

/** Map a shared_heralds row to ShareInfo (pure, for testing). */
export function toShareInfo(row: Record<string, unknown>, legacy = false): ShareInfo {
  return {
    token: row.token as string,
    updatedAt: row.updated_at as string,
    createdAt: (row.created_at as string | undefined) ?? undefined,
    expiresAt: (row.expires_at as string | null | undefined) ?? null,
    lastViewedAt: (row.last_viewed_at as string | null | undefined) ?? null,
    viewCount: typeof row.view_count === "number" ? row.view_count : 0,
    legacy,
  };
}

/** The current share for a participant, if one exists (RLS scopes to owner). */
export async function getShare(participantId: string): Promise<ShareInfo | null> {
  const { getSupabase } = await import("./supabaseClient");
  const supabase = getSupabase();
  const full = await supabase.from(TABLE).select(COLUMNS).eq("participant_id", participantId).maybeSingle();
  if (!full.error) return full.data ? toShareInfo(full.data) : null;
  if (full.error.code !== UNDEFINED_COLUMN) throw new Error(full.error.message);
  const legacy = await supabase
    .from(TABLE)
    .select(LEGACY_COLUMNS)
    .eq("participant_id", participantId)
    .maybeSingle();
  if (legacy.error) throw new Error(legacy.error.message);
  return legacy.data ? toShareInfo(legacy.data, true) : null;
}

/**
 * Publish (or republish) a participant's share. Update-then-insert rather
 * than an upsert — a republish keeps the existing token, so the link the
 * participant already holds stays alive. `expiresAt` is written only when
 * given (a republish leaves the link's expiry as it was).
 */
export async function publishShare(
  participantId: string,
  payload: SharedHeraldPayload,
  expiresAt?: string | null,
): Promise<ShareInfo> {
  const { getSupabase } = await import("./supabaseClient");
  const supabase = getSupabase();
  const fields = expiresAt === undefined ? { data: payload } : { data: payload, expires_at: expiresAt };
  const { data: updated, error: upErr } = await supabase
    .from(TABLE)
    .update(fields)
    .eq("participant_id", participantId)
    .select("token");
  if (upErr) throw new Error(upErr.message);
  if (!updated || updated.length === 0) {
    const { error: insErr } = await supabase
      .from(TABLE)
      .insert({ participant_id: participantId, ...fields });
    if (insErr) throw new Error(insErr.message);
  }
  const info = await getShare(participantId);
  if (!info) throw new Error("The share was saved but could not be read back.");
  return info;
}

/** Set (or clear, with null) when the link stops opening. */
export async function setShareExpiry(participantId: string, expiresAt: string | null): Promise<ShareInfo> {
  const { getSupabase } = await import("./supabaseClient");
  const { error } = await getSupabase()
    .from(TABLE)
    .update({ expires_at: expiresAt })
    .eq("participant_id", participantId);
  if (error) throw new Error(error.message);
  const info = await getShare(participantId);
  if (!info) throw new Error("This share no longer exists.");
  return info;
}

/**
 * Reset the link: the old token goes dark and the given snapshot is
 * published under a new one, keeping the expiry (for a link that reached
 * the wrong hands). The view history starts afresh with the new token.
 */
export async function rotateShare(
  participantId: string,
  payload: SharedHeraldPayload,
  expiresAt: string | null,
): Promise<ShareInfo> {
  await revokeShare(participantId);
  return publishShare(participantId, payload, expiresAt);
}

/** Revoke the share — the link goes dark immediately. */
export async function revokeShare(participantId: string): Promise<void> {
  const { getSupabase } = await import("./supabaseClient");
  const { error } = await getSupabase().from(TABLE).delete().eq("participant_id", participantId);
  if (error) throw new Error(error.message);
}

/**
 * The outcome of an anonymous read. `missing` covers invalid, revoked,
 * expired and garbage tokens alike — they stay indistinguishable. `error` is
 * only for not reaching the Treasury at all (offline, or a server fault), so
 * the page can say "try again" instead of "this link is dark".
 */
export type SharedFetchResult =
  | { kind: "found"; payload: SharedHeraldPayload }
  | { kind: "missing" }
  | { kind: "error" };

/** Map a PostgREST RPC response to a fetch result (pure, for testing). */
export function classifySharedFetch(response: {
  data: unknown;
  error: { message: string } | null;
  status: number;
}): SharedFetchResult {
  if (response.error) {
    // Status 0 is supabase-js's report of a fetch that never completed.
    return response.status === 0 || response.status >= 500 ? { kind: "error" } : { kind: "missing" };
  }
  if (!response.data) return { kind: "missing" };
  return { kind: "found", payload: response.data as SharedHeraldPayload };
}

/** Anonymous read by exact token. */
export async function fetchSharedHerald(token: string): Promise<SharedFetchResult> {
  if (!isShareToken(token)) return { kind: "missing" };
  try {
    const { getSupabase } = await import("./supabaseClient");
    const response = await getSupabase().rpc("get_shared_herald", { share_token: token });
    return classifySharedFetch(response);
  } catch {
    return { kind: "error" };
  }
}
