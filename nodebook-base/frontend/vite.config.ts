import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all API requests
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
      // Explicitly proxy WebSocket connections
      '/ws': {
        target: 'ws://localhost:3000',
        ws: true,
      },
    }
  }
})