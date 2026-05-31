import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.PORTAL_PORT || '3002'),
    proxy: {
      '/auth': { target: BACKEND_URL, changeOrigin: true },
      '/access': { target: BACKEND_URL, changeOrigin: true },
      '/license': { target: BACKEND_URL, changeOrigin: true },
      '/portal': { target: BACKEND_URL, changeOrigin: true },
    },
  },
})
