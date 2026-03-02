import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src-alpine/index.js'),
      name: 'Selectra',
      fileName: (format) => `selectra.${format}.js`,
      formats: ['es', 'umd', 'iife'],
    },
    outDir: 'dist',
    rollupOptions: {
      external: [],
      output: {
        exports: 'named',
        globals: {
        },
        assetFileNames: 'selectra.[ext]',
      },
    },
    cssCodeSplit: false,
    sourcemap: true,
    minify: 'terser',
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src-alpine'),
    },
  },
});
