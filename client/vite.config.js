import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)));

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      '@shared': path.resolve(root, '../shared'),
      '@client': path.resolve(root, 'src')
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
