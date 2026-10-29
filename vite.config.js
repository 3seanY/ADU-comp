import { defineConfig } from 'vite';

export default defineConfig({
  server: { proxy: { '/api': { target: 'http://127.0.0.1:3001', timeout: 120000, proxyTimeout: 120000 } } },
  preview: { proxy: { '/api': { target: 'http://127.0.0.1:3001', timeout: 120000, proxyTimeout: 120000 } } },
});
