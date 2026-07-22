import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3050,
    host: '0.0.0.0',
    allowedHosts: ['starlink.hospedajesvelasquez.com'],
    watch: {
      usePolling: true,
    },
  }
})
