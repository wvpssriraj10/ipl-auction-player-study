import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'demo/public',
  server: {
    port: 3000,
    open: '/demo/index.html',
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
