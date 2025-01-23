import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['T.ico', 'T.png', 'T.svg'],
      manifest: {
        name: 'TimeSaver Laundry App',
        short_name: 'TimeSaver',
        description: 'Your smart laundry management app',
        theme_color: '#ffffff',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        icons: [
          {
            src: 'T.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'T.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
