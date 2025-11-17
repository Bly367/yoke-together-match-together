import React, { useEffect, useState } from 'react';
import { isSupabaseConfigured, getSupabaseConfigError } from '@/integrations/supabase/client';

/**
 * Diagnostic component to help debug white screen issues
 * Shows environment info and errors
 */
export const DiagnosticInfo: React.FC = () => {
  const [errors, setErrors] = useState<Array<{ message: string; stack?: string }>>([]);
  const [envInfo, setEnvInfo] = useState<Record<string, string>>({});

  useEffect(() => {
    // Capture errors
    const handleError = (event: ErrorEvent) => {
      setErrors(prev => [...prev, {
        message: event.message || 'Unknown error',
        stack: event.error?.stack
      }]);
      console.error('Diagnostic: Error caught', event);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      setErrors(prev => [...prev, {
        message: String(event.reason?.message || event.reason || 'Unhandled rejection'),
        stack: event.reason?.stack
      }]);
      console.error('Diagnostic: Promise rejection', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    // Gather environment info
    setEnvInfo({
      'Supabase Configured': isSupabaseConfigured() ? 'Yes' : 'No',
      'Supabase Error': getSupabaseConfigError() || 'None',
      'VITE_SUPABASE_URL': import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
      'VITE_SUPABASE_PUBLISHABLE_KEY': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Missing',
      'Mode': import.meta.env.MODE,
      'Production': import.meta.env.PROD ? 'Yes' : 'No',
    });

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      color: '#0f0',
      fontFamily: 'monospace',
      padding: '20px',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <h1 style={{ color: '#0f0', marginBottom: '20px' }}>🔍 Diagnostic Information</h1>
      
      <h2 style={{ color: '#0ff', marginTop: '20px' }}>Environment Variables:</h2>
      <pre style={{ backgroundColor: '#111', padding: '10px', borderRadius: '4px' }}>
        {JSON.stringify(envInfo, null, 2)}
      </pre>

      {errors.length > 0 && (
        <>
          <h2 style={{ color: '#f00', marginTop: '20px' }}>Errors ({errors.length}):</h2>
          {errors.map((error, idx) => (
            <div key={idx} style={{ 
              backgroundColor: '#200', 
              padding: '10px', 
              marginBottom: '10px',
              borderRadius: '4px'
            }}>
              <div style={{ color: '#f00', fontWeight: 'bold' }}>Error {idx + 1}:</div>
              <div style={{ color: '#faa' }}>{error.message}</div>
              {error.stack && (
                <pre style={{ 
                  fontSize: '10px', 
                  color: '#aaa', 
                  marginTop: '5px',
                  overflow: 'auto'
                }}>{error.stack}</pre>
              )}
            </div>
          ))}
        </>
      )}

      <div style={{ marginTop: '20px', color: '#aaa' }}>
        <p>If you see this screen, React is rendering but something is preventing the app from loading.</p>
        <p>Check the browser console (F12) for more details.</p>
      </div>
    </div>
  );
};

