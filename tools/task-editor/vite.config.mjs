import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig({
  root: fileURLToPath(new URL('./', import.meta.url)),
  plugins: [react()],
  envPrefix: 'AUTHORING_PUBLIC_',
  server: {
    host: '127.0.0.1',
    port: 5182,
    strictPort: true,
    cors: false,
    fs: {
      strict: true,
      allow: [fileURLToPath(new URL('../../', import.meta.url))],
      deny: ['**/.env*', '**/.git/**', '**/.local/**', '**/*.sqlite*', '**/*.pem'],
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../../.local/task-editor-build', import.meta.url)),
    emptyOutDir: true,
  },
});
