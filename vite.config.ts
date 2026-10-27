import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Web (GitHub Pages) → '/s24-erp/'   ·   Capacitor/APK → './'
  base: mode === 'capacitor' ? './' : '/s24-erp/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: { port: 3000, open: true },
  build: {
    chunkSizeWarningLimit: 1500,
  },
}));