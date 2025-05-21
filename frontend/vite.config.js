// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 🔥 This ensures relative paths in built index.html
  build: {
    outDir: 'dist',
  },
})
