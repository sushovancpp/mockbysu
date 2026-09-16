import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sushovan.soitmock',
  appName: 'MockBySu',
  webDir: "www",
  server: {
    url: "https://mockbysu.vercel.app",
    cleartext: false,
  },
};

export default config;