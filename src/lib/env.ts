/**
 * Environment access. Kept in one place so nothing else reaches into
 * `import.meta.env` and so misconfiguration fails loudly and early.
 */
export const env = {
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL ?? "").trim(),
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim(),
} as const;

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);

export const MISSING_SUPABASE_MESSAGE =
  "Supabase is not configured. Copy .env.example to .env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.";
