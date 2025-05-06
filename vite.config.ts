import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*', 'screenshots/*'],
      manifest: {
        name: 'PdfCircle - Document & Image Converter Tools',
        short_name: 'PdfCircle',
        description: 'Convert, Compress, and Enhance Your Documents and Images for Better Performance and Quality',
        theme_color: '#4f46e5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        categories: ['productivity', 'utilities'],
        icons: [
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 25 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/docs\.opencv\.org\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'opencv-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 5 },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            urlPattern: /\.(js|css|woff2|json|wasm)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 2 }
            }
          },
          {
            urlPattern: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api/,
          /^\/ads/,
          /^\/pagead/,
          /^\/adsbygoogle/,
          /^https:\/\/pagead2\.googlesyndication\.com/,
          /^https:\/\/googleads\.g\.doubleclick\.net/,
          /^https:\/\/www\.google-analytics\.com/,
          /^https:\/\/partner\.googleadservices\.com/,
          /^https:\/\/tpc\.googlesyndication\.com/,
        ],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      }
    })
  ],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  resolve: {
    alias: { path: 'path-browserify' }
  },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=self',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'cross-origin',
      'Access-Control-Allow-Origin': '*'
    }
  },
  build: {
    target: ['es2020'],
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['pdf-lib', 'jspdf', 'pdfjs-dist'],
          'vendor-ui': ['lucide-react', '@dnd-kit/core'],
        }
      }
    },
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
      output: { comments: false }
    }
  }
});