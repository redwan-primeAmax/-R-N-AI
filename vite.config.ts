import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false,
        },
        injectRegister: 'auto',
        includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
        manifest: {
          id: 'redwan-ai-note',
          name: 'Redwan AI Note',
          short_name: 'RN AI',
          description: 'A professional AI-powered note-taking application',
          theme_color: '#0a0a0a',
          background_color: '#0a0a0a',
          display: 'standalone',
          orientation: 'portrait',
          scope: './',
          start_url: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any'
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable'
            }
          ]
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,txt,json,woff,woff2}'],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          runtimeCaching: [
            {
              urlPattern: ({request}) => request.destination === 'document' || request.mode === 'navigate',
              handler: 'NetworkFirst',
              options: {
                cacheName: 'html-cache',
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                }
              }
            },
            {
              urlPattern: ({request}) => request.destination === 'style' || request.destination === 'script' || request.destination === 'worker',
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'static-resources',
              }
            },
            {
              urlPattern: ({request}) => request.destination === 'image',
              handler: 'CacheFirst',
              options: {
                cacheName: 'image-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                }
              }
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 30 
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        }
      })
    ],
    define: {
      __BUILD_HASH__: JSON.stringify(crypto.randomUUID().slice(0, 8)),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      target: 'es2020',
      cssCodeSplit: true,
      minify: 'esbuild', // Faster and good enough, using terser requires extra dependency
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-core';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-motion';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('dexie') || id.includes('localforage')) {
                return 'vendor-storage';
              }
              return 'vendor-others';
            }
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
