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

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  const errorMessage = 
    '❌ Missing required Supabase environment variables. ' +
    'Please set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY. ' +
    'See DEPLOYMENT.md or SETUP_INSTRUCTIONS.md for details.';
  
  if (import.meta.env.PROD) {
    // In production, throw an error to prevent runtime issues
    throw new Error(errorMessage);
  } else {
    // In development, log error but allow app to continue
    // Note: Logger not imported here to avoid circular dependency
    // This is acceptable as it's only for environment validation
    console.error(errorMessage);
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