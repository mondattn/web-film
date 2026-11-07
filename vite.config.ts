import { defineConfig } from 'vite';

// SPA: mọi đường dẫn (/phim/<slug>, /the-loai/<slug>, …) đều trả index.html, router ở src/main.ts.
export default defineConfig({
  appType: 'spa',
  server: { port: 5176, host: '127.0.0.1' },
  preview: { port: 5176 },
  build: { target: 'es2022', sourcemap: true },
});
