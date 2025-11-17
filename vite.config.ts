import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Security headers for development (production should be handled by CDN/reverse proxy)
    headers: mode === "production" ? {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co https://*.supabase.in;",
    } : {},
  },
  plugins: [
    react(), 
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24, // 24 hours
              },
            },
          },
        ],
      },
      manifest: {
        name: 'Yoke - Two-Man Dating App',
        short_name: 'Yoke',
        description: 'Match together, chat together',
        theme_color: '#F9D648',
        icons: [
          {
            src: '/favicon.ico',
            sizes: '64x64 32x32 24x24 16x16',
            type: 'image/x-icon',
          },
        ],
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunks for better caching
          if (id.includes('node_modules')) {
            // React and React DOM - MUST be in same chunk and load first
            // Keep React in main bundle to ensure it loads before everything else
            if (id.includes('react') || id.includes('react-dom')) {
              // Don't split React - keep it in main bundle for reliability
              return undefined;
            }
            // React Router - depends on React
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            // React Query - depends on React
            if (id.includes('@tanstack/react-query')) {
              return 'query-vendor';
            }
            // Radix UI components (large library) - depends on React
            // Keep Radix UI in main bundle too since it uses React.createContext
            if (id.includes('@radix-ui')) {
              return undefined; // Keep in main bundle to ensure React is available
            }
            // Supabase - keep in main bundle to avoid initialization order issues
            if (id.includes('@supabase')) {
              return undefined; // Keep in main bundle to prevent circular dependency errors
            }
            // Other node_modules
            return 'vendor';
          }
        },
        // Ensure proper chunk loading order
        chunkFileNames: (chunkInfo) => {
          // Ensure React loads first by keeping it in main bundle
          return chunkInfo.name === 'index' ? 'assets/[name]-[hash].js' : 'assets/[name]-[hash].js';
        },
      },
    },
    // Warn on large chunks
    chunkSizeWarningLimit: 1000,
    // Source maps for production debugging (can be disabled for smaller builds)
    sourcemap: mode === "development",
    // Ensure proper module resolution
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
  },
}));
