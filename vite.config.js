import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: 'assets/js/main.js',
      output: {
        entryFileNames: 'assets/js/bundle.js',
        assetFileNames: 'assets/[name][extname]'
      }
    }
  }
});
