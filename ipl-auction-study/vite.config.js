import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  root: '.',
  server: {
    port: 3000,
    open: '/demo/index.html'
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  }
});
