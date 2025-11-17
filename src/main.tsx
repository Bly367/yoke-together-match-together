import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Add diagnostic logging
console.log('🚀 App starting...');
console.log('Environment:', {
  MODE: import.meta.env.MODE,
  PROD: import.meta.env.PROD,
  DEV: import.meta.env.DEV,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing',
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Missing',
});

// Catch any errors during initial render
try {
  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("Root element not found!");
  }
  
  console.log('✅ Root element found, creating React root...');
  const root = createRoot(rootElement);
  
  console.log('✅ React root created, rendering App...');
  root.render(<App />);
  console.log('✅ App rendered successfully');
} catch (error) {
  console.error('❌ Fatal error during app initialization:', error);
  
  // Show error on page
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        padding: 20px;
        font-family: system-ui, -apple-system, sans-serif;
        background: #000;
        color: #f00;
        text-align: center;
      ">
        <h1 style="font-size: 24px; margin-bottom: 20px;">❌ Fatal Error</h1>
        <pre style="
          background: #111;
          padding: 20px;
          border-radius: 8px;
          color: #faa;
          text-align: left;
          max-width: 800px;
          overflow: auto;
        ">${error instanceof Error ? error.message : String(error)}\n\n${error instanceof Error ? error.stack : ''}</pre>
        <p style="margin-top: 20px; color: #aaa;">Check the browser console (F12) for more details.</p>
      </div>
    `;
  }
}
