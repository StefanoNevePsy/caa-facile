import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * `base` cambia in base al bersaglio:
 *  - GitHub Pages passa VITE_BASE=/<nome-repo>/ (serve un percorso assoluto
 *    perché il service worker abbia lo scope corretto);
 *  - Electron e Capacitor caricano i file da disco, quindi restano su './'.
 */
const base = process.env.VITE_BASE || './'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Registriamo il service worker a mano in main.tsx: su Electron (file://)
      // e nelle build native la registrazione va saltata.
      injectRegister: false,
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'CAA Facile',
        short_name: 'CAA Facile',
        description:
          'Strumenti di Comunicazione Aumentativa Alternativa: griglie, agende visive, token economy, storie sociali, PECS e timer visivi.',
        lang: 'it',
        dir: 'ltr',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f8fafc',
        theme_color: '#2563eb',
        categories: ['education', 'medical', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Il modello AI (44 MB) e i binari WASM non entrano nel precache: si
        // scaricano solo quando l'utente usa davvero la rimozione sfondo.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        globIgnores: ['**/models/**'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            // Modello ONNX + runtime WASM: immutabili, quindi cache permanente.
            urlPattern: ({ url }) => url.pathname.endsWith('.wasm') || url.pathname.includes('/models/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'caa-ai-runtime',
              expiration: { maxEntries: 12, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
          {
            // Pittogrammi ARASAAC: una volta visti restano disponibili offline.
            urlPattern: ({ url }) => url.hostname.endsWith('arasaac.org'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'caa-arasaac',
              expiration: { maxEntries: 2000, maxAgeSeconds: 180 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  worker: {
    // Il worker RMBG usa import ESM: senza questo Vite lo compila in IIFE e fallisce.
    format: 'es',
  },
  optimizeDeps: {
    // onnxruntime-web va lasciato ai suoi bundle già pronti.
    exclude: ['onnxruntime-web'],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          sync: ['peerjs', 'html5-qrcode', 'qrcode.react'],
        },
      },
    },
  },
})
