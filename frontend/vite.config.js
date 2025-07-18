// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import UnoCSS from 'unocss/vite'

export default defineConfig({
  plugins: [react(), UnoCSS()],
  base: './', // Use relative paths for Electron AppImage
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      }
    }
  }
})

