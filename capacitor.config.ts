import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.s24.erp',
  appName: 'S24 ERP',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;