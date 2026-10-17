import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { env, isSupabaseConfigured, MISSING_SUPABASE_MESSAGE } from "./env";

function createSupabaseClient() {
  if (!isSupabaseConfigured) {
    // A placeholder client keeps the module import-safe so the app can render a
    // friendly "configure Supabase" screen instead of crashing at boot.
    return createClient<Database>("http://localhost:54321", "public-anon-key", {
      auth: { persistSession: false },
    });
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      storageKey: "domainfolio.auth",
    },
  });
}

export const supabase = createSupabaseClient();

export { MISSING_SUPABASE_MESSAGE, isSupabaseConfigured };

/** Escapes a user-supplied string for use inside a PostgREST `or()`/`ilike` filter. */
export function escapeForFilter(value: string) {
  return value.replace(/[%,()\\]/g, char => `\\${char}`);
}
