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
  updatedAt: string;
}

/** The current share for a participant, if one exists (RLS scopes to owner). */
export async function getShare(participantId: string): Promise<ShareInfo | null> {
  const { getSupabase } = await import("./supabaseClient");
  const { data, error } = await getSupabase()
    .from(TABLE)
    .select("token, updated_at")
    .eq("participant_id", participantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? { token: data.token as string, updatedAt: data.updated_at as string } : null;
}

/**
 * Publish (or republish) a participant's share. Update-then-insert rather
 * than an upsert — a republish keeps the existing token, so the link the
 * participant already holds stays alive.
 */
export async function publishShare(
  participantId: string,
  payload: SharedHeraldPayload,
): Promise<string> {
  const { getSupabase } = await import("./supabaseClient");
  const supabase = getSupabase();
  const { data: updated, error: upErr } = await supabase
    .from(TABLE)
    .update({ data: payload })
    .eq("participant_id", participantId)
    .select("token");
  if (upErr) throw new Error(upErr.message);
  if (updated && updated.length > 0) return updated[0].token as string;
  const { data: inserted, error: insErr } = await supabase
    .from(TABLE)
    .insert({ participant_id: participantId, data: payload })
    .select("token")
    .single();
  if (insErr) throw new Error(insErr.message);
  return inserted.token as string;
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
