import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

/**
 * The only file in this app that imports `@supabase/supabase-js` (the whole
 * SDK tree is MIT — verified against the npm registry; same isolation rule
 * as `hebrewCalendar.ts` for `jewish-date`). Lazy singleton: nothing
 * initializes unless the deployment configured the cloud AND something
 * actually asks for the client.
 */
let client: SupabaseClient | undefined;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("The Scribes' Cloud is not configured for this deployment.");
  }
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return client;
}
