import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: [
      '@reown/appkit/react',
      '@reown/appkit-adapter-wagmi',
      'wagmi',
      'viem'
    ]
  },
  // 🔥 OPTIMIZACIÓN: Configuraciones para reducir solicitudes RPC
  server: {
    // Configurar headers CORS para desarrollo
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'unsafe-none',
      'Cross-Origin-Resource-Policy': 'cross-origin'
    },
    // Configurar proxy si es necesario para evitar CORS
    proxy: {
      // Proxy para evitar CORS con RPCs específicos si es necesario
      '/api/rpc': {
        target: 'https://api.avax-test.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/rpc/, '/ext/bc/C/rpc')
      }
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
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
    global: 'globalThis'
  },
  // Resolver alias para evitar problemas con módulos
  resolve: {
    alias: {
      // Alias para evitar problemas con algunos módulos de Node.js
      crypto: 'crypto-browserify',
      stream: 'stream-browserify',
      buffer: 'buffer'
    }
  }
});
