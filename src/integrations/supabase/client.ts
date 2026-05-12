import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client configuration
 * 
 * Environment variables required:
 * - VITE_SUPABASE_URL: Your Supabase project URL
 * - VITE_SUPABASE_PUBLISHABLE_KEY: Your Supabase anon/public key
 * 
 * Import the supabase client like this:
 * ```ts
 * import { supabase } from "@/integrations/supabase/client";
 * ```
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Check if Supabase environment variables are configured
 * @returns true if both variables are set, false otherwise
 */
export function isSupabaseConfigured(): boolean {
  return !!(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);
}

/**
 * Get error message for missing environment variables
 */
export function getSupabaseConfigError(): string | null {
  if (!SUPABASE_URL && !SUPABASE_PUBLISHABLE_KEY) {
    return 'Missing VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY environment variables.';
  }
  if (!SUPABASE_URL) {
    return 'Missing VITE_SUPABASE_URL environment variable.';
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    return 'Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable.';
  }
  return null;
}

/**
 * Supabase client instance
 * 
 * Configured with:
 * - localStorage for session persistence
 * - Auto-refresh token enabled
 *
 * The client is intentionally **not** parameterized with `Database` from `./types`.
 * Full PostgREST embed + row typing requires `supabase link` and `npm run types:generate`.
 * Until then, domain types live on service interfaces; queries stay type-safe at the
 * application layer via explicit casts where needed.
 *
 * Note: Client is created even if env vars are missing to prevent module initialization errors.
 * Use isSupabaseConfigured() to check if client is properly configured before use.
 */
export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_PUBLISHABLE_KEY || 'placeholder-key',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);