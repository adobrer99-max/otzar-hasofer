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

/** Anonymous read by exact token; null for anything invalid/revoked. */
export async function fetchSharedHerald(token: string): Promise<SharedHeraldPayload | null> {
  if (!isShareToken(token)) return null;
  try {
    const { getSupabase } = await import("./supabaseClient");
    const { data, error } = await getSupabase().rpc("get_shared_herald", { share_token: token });
    if (error || !data) return null;
    return data as SharedHeraldPayload;
  } catch {
    return null;
  }
}
