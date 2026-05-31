import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

/** Backend routes used by Professional — proxy when VITE_API_URL is unset. */
const API_PROXY_PATHS = [
  '/auth',
  '/access',
  '/license',
  '/portal',
  '/canvas',
  '/finops',
  '/generate',
  '/estimate',
  '/import-tf',
  '/import-plan',
  '/design',
  '/chat',
  '/health',
]

export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.FRONTEND_PORT || '3000'),
    proxy: Object.fromEntries(
      API_PROXY_PATHS.map((path) => [
        path,
        { target: BACKEND_URL, changeOrigin: true },
      ]),
    ),
  },
})
