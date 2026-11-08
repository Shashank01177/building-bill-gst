import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.building.billgst',
  appName: 'BuildingBill GST',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
