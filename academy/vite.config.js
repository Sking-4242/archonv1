import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// When running in Docker the backend is reachable via the service name.
// Locally (npm run dev without Docker) it's on localhost.
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.ACADEMY_PORT || '3001'),
    proxy: {
      // All /academy/* requests are forwarded to the backend.
      // The browser sees them as same-origin (localhost:3001), so no CORS.
      '/academy': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
    },
  },
})
