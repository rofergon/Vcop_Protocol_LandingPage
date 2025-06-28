import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  // 🔥 OPTIMIZACIÓN: Configuraciones para reducir solicitudes RPC
  server: {
    // Configurar headers CORS para desarrollo
    cors: true,
    // Configurar proxy si es necesario para evitar CORS
    proxy: {
      // Opcional: proxy para RPC endpoints si hay problemas de CORS
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        about: 'about.html',
      },
    },
    // 🔥 OPTIMIZACIÓN: Configuraciones de build para mejor rendimiento
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 8192
  },
  // 🔥 OPTIMIZACIÓN: Configurar cache para mejor rendimiento
  define: {
    // Configuraciones globales para optimización
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development')
  }
});
