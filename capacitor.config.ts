import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.corvix.app',
  appName: 'Corvix',
  webDir: 'public',
  server: {
    url: 'https://corvix-nine.vercel.app',
    allowNavigation: [
      'corvix-nine.vercel.app',
      '*.vercel.app',
      '*.aws.neon.tech',
    ],
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#0f172a',
  },
};

export default config;
