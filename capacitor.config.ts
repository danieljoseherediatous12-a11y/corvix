import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corvix.app',
  appName: 'Corvix',
  webDir: 'public',
  server: {
    url: 'http://192.168.101.6:3000',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
