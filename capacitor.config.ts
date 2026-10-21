import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wisdomark.app',

  appName: 'Wisdom Ark',

  webDir: 'dist/wisdom-ark/browser',

  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0F4F2A',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;