import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corvix.app',
  appName: 'Corvix',
  webDir: 'public',
  server: {
    url: 'https://corvix-nine.vercel.app',
    cleartext: false,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
