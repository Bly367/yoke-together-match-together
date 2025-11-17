import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured, getSupabaseConfigError } from '@/integrations/supabase/client';

/**
 * Configuration Error Component
 * Displays a helpful error message when required environment variables are missing
 */
export const ConfigError: React.FC = () => {
  const errorMessage = getSupabaseConfigError();

  if (!errorMessage) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-card rounded-3xl shadow-[var(--shadow-card)] p-8 space-y-6 animate-slide-up">
          {/* Error Icon */}
          <div className="flex justify-center">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
          </div>

          {/* Error Message */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground">Configuration Error</h1>
            <p className="text-muted-foreground">
              {errorMessage}
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">To fix this:</p>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Go to your Vercel project settings</li>
              <li>Navigate to <strong>Settings → Environment Variables</strong></li>
              <li>Add the following variables:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li><code className="bg-background px-2 py-1 rounded">VITE_SUPABASE_URL</code> - Your Supabase project URL</li>
                  <li><code className="bg-background px-2 py-1 rounded">VITE_SUPABASE_PUBLISHABLE_KEY</code> - Your Supabase anon/public key</li>
                </ul>
              </li>
              <li>Redeploy your application</li>
            </ol>
          </div>

          {/* Help Text */}
          <p className="text-center text-sm text-muted-foreground">
            You can find these values in your Supabase Dashboard under <strong>Settings → API</strong>.
          </p>
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to check if Supabase is configured
 * Use this in components that need Supabase to ensure it's available
 */
export function useSupabaseConfig() {
  const isConfigured = isSupabaseConfigured();
  const errorMessage = getSupabaseConfigError();

  return {
    isConfigured,
    errorMessage,
  };
}

