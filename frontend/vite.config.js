import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy Socket.IO WebSocket + polling so the horse-owner notification bell works in dev.
      '/socket.io': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
      // Proxy /notifications namespace (Socket.IO) for spectator + horse-owner real-time.
      '/notifications': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  optimizeDeps: {
    include: ['recharts', 'recharts-scale', 'victory-vendor/d3-scale', 'victory-vendor/d3-shape', 'd3-path', 'd3-interpolate', 'd3-color'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
