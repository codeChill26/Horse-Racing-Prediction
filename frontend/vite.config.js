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
