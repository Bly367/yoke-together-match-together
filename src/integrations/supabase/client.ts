import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

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

// Validate environment variables in development
if (import.meta.env.DEV) {
  if (!SUPABASE_URL) {
    console.error(
      '❌ Missing VITE_SUPABASE_URL environment variable. ' +
      'Please add it to your .env file. See SETUP_INSTRUCTIONS.md for details.'
    );
  }
  if (!SUPABASE_PUBLISHABLE_KEY) {
    console.error(
      '❌ Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable. ' +
      'Please add it to your .env file. See SETUP_INSTRUCTIONS.md for details.'
    );
  }
}

/**
 * Supabase client instance
 * 
 * Configured with:
 * - localStorage for session persistence
 * - Auto-refresh token enabled
 * - Typed with Database schema (when types are generated)
 */
export const supabase = createClient<Database>(
  SUPABASE_URL || '',
  SUPABASE_PUBLISHABLE_KEY || '',
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);