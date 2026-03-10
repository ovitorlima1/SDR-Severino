import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      proxy: {
        '/kommo-api': {
          target: env.VITE_KOMMO_SUBDOMAIN
            ? `https://${env.VITE_KOMMO_SUBDOMAIN}.kommo.com`
            : (env.VITE_KOMMO_API_DOMAIN?.includes('.')
              ? `https://${env.VITE_KOMMO_API_DOMAIN}`
              : `https://${env.VITE_KOMMO_API_DOMAIN}.kommo.com`),
          changeOrigin: true,
          rewrite: (path: string) => path.replace(/^\/kommo-api/, ''),
          headers: {
            Authorization: `Bearer ${env.VITE_KOMMO_TOKEN}`,
          },
        }
      }
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
