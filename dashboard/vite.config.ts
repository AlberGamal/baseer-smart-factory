import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Required for local development through a temporary proxied hostname.
    allowedHosts: true,
  },
});
