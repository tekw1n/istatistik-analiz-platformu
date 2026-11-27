import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths work at a domain root (Vercel) and under /<repository>/ (GitHub Pages).
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rolldownOptions: {
      output: {
        // KaTeX gets its own cacheable chunk (the successor of `manualChunks` in Vite 8).
        codeSplitting: { groups: [{ name: 'katex', test: /node_modules[\\/]katex[\\/]/ }] },
      },
    },
  },
});
