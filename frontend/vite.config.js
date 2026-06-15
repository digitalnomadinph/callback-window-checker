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
  build: {
    // On Netlify (NETLIFY=true is set automatically), output to the default dist/
    // folder so Netlify can find and deploy it.
    // Locally, output to ../backend/public so Express can serve the frontend too.
    outDir: process.env.NETLIFY ? 'dist' : '../backend/public',
    emptyOutDir: true,
  },
});
