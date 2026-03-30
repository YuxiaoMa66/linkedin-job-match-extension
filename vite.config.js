import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    target: 'es2022',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.js'),
        'content/index': resolve(__dirname, 'src/content/index.js'),
        'sidepanel/index': resolve(__dirname, 'src/sidepanel/index.html')
      },
      output: {
        entryFileNames: 'src/[name].js',
        chunkFileNames: 'src/shared/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
