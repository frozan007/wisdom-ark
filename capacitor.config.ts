import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wisdomark.app',

  appName: 'Wisdom Ark',

  webDir: 'dist/wisdom-ark/browser',

  plugins: {
    SplashScreen: {
      // Hidden by the splash page once the login check finishes.
      launchAutoHide: false,
      backgroundColor: '#0F4F2A',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;