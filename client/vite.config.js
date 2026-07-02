import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: false,
    proxy: {
      // Proxy /api requests to the Express backend during development.
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
      // Proxy /uploads requests so submitted files can be viewed.
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Heavy vendor libraries -> separate cacheable chunks
          if (id.includes('node_modules/recharts')) {
            return 'vendor-recharts';
          }
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
          // Everything else from node_modules: react, react-dom,
          // react-router-dom, recharts deps, etc. go into vendor-libs.
          // This avoids circular-chunk warnings from splitting react
          // away from its dependents.
          if (id.includes('node_modules')) {
            return 'vendor-libs';
          }
        },
      },
    },
  },
});
