import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const path = id.replaceAll('\\', '/');
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(path)) return 'react';
          if (path.includes('/node_modules/lucide-react/')) return 'icons';
        },
      },
    },
  },
  server: {
    host: '127.0.0.1',
    fs: { strict: true },
    proxy: { '/api': { target: 'http://127.0.0.1:4174', changeOrigin: false } },
    headers: { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' },
  },
});
