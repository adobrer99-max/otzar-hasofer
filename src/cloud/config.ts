/**
 * Cloud configuration for the Scribes' Cloud (Supabase). Both values are
 * optional build-time env vars — when absent, the app runs fully local,
 * exactly as it did before any cloud existed. This module reads env only;
 * the Supabase SDK is imported solely by `supabaseClient.ts`.
 */
export const SUPABASE_URL: string | undefined = import.meta.env.VITE_SUPABASE_URL;
export const SUPABASE_ANON_KEY: string | undefined = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isCloudConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
