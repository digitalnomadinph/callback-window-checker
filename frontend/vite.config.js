import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // In production build, output goes into backend/public so Express can serve it
  build: {
    outDir: '../backend/public',
    emptyOutDir: true,
  },
});
