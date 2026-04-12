import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Used when root is this `demo/` folder (`vite build demo` / `vite` from demo). */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        teams: path.resolve(__dirname, 'teams.html'),
      },
    },
  },
});
