import { defineConfig } from 'vite';
import { createRequire } from 'node:module';

const { version } = createRequire(import.meta.url)('./scripts/version.cjs');

export default defineConfig({
  // Relative base so the built bundle also loads from file:// inside Electron.
  base: './',
  // The update number (scripts/version.cjs), shown in the pause menu.
  define: { __ESTER_VERSION__: JSON.stringify(version()) },
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext'
  }
});
