import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.PORT) || 4173,
    allowedHosts: [
      'cleaniqo-booking-production.up.railway.app',
      '.up.railway.app',
      '.cleaniqo.co.uk',
      'cleaniqo.co.uk',
      'localhost',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
