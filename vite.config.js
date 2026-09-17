import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built bundle also loads from file:// inside Electron.
  base: './',
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
