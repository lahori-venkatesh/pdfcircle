import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Custom plugin for image caching headers in dev server
const imageCachingPlugin = {
  name: 'image-caching',
  configureServer(server: any) {
    server.middlewares.use((req, res, next) => {
      if (/\.(png|jpg|jpeg|gif|webp|ico)$/i.test(req.url || '')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
        res.setHeader('Expires', new Date(Date.now() + 31536000 * 1000).toUTCString());
      }
      next();
    });
  },
};

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
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png', purpose: 'any maskable' },
        ],
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
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(js|css|woff2|json|wasm)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 60 * 24 * 2 },
            },
          },
          // Add image caching for production consistency
          {
            urlPattern: /\.(png|jpg|jpeg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 365 }, // 1 year
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
      },
    }),
    imageCachingPlugin, // Add plugin for dev server image caching
  ],
  assetsInclude: ['**/*.wasm'],
  optimizeDeps: {
    exclude: ['@imgly/background-removal'],
    esbuildOptions: { target: 'esnext' },
  },
  resolve: { alias: { path: 'path-browserify' } },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=self',
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      'Cross-Origin-Resource-Policy': 'cross-origin',
    },
  },
  build: {
    target: ['es2020'],
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]', // Simplified for consistency
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-pdf': ['pdf-lib', 'jspdf', 'pdfjs-dist'],
          'vendor-ui': ['lucide-react', '@dnd-kit/core'],
          'vendor-imgly': ['@imgly/background-removal'],
        },
      },
    },
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true, drop_debugger: true },
      output: { comments: false },
    },
  },
});