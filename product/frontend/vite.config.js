import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api/product': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/products': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/api/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/cart': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/api/orders': {
        target: 'http://localhost:3003',
        changeOrigin: true,
      },
      '/api/payment': {
        target: 'http://localhost:3004',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://localhost:3005',
        changeOrigin: true,
      },
    },
  },
});
