import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.isiba.portalcolaborador',
  appName: 'Portal Colaborador ISIBA',
  webDir: 'out',
  server: {
    // Aponta para a URL de produção na Vercel — o APK usa a API real
    url: 'https://application-portal-do-colaborador-p.vercel.app',
    cleartext: false, // Apenas HTTPS
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Desativar em produção
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#134e4a',
      showSpinner: false,
    },
  },
};

export default config;
