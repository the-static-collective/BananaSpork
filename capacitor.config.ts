import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'collective.app.bananagram',
  appName: 'NanaSpork',
  webDir: 'dist/client',
  loggingBehavior: 'debug',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  server: {
    androidScheme: 'https',
    cleartext: false,
    errorPath: 'native-error.html',
  },
};

export default config;
