import { defineConfig } from 'vite';
import { resolve } from 'path';
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  define: {
    __PKG_VERSION__: JSON.stringify(pkg.version),
  },
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
        banner: `/*! Selectra v${pkg.version} | Apache-2.0 License */`,
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
