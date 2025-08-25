import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '')
  
  // Use the VITE_API_TARGET environment variable.
  // In the docker-compose.dev.yml, this is set to 'http://backend:3000'
  const proxyTarget = env.VITE_API_TARGET;

  if (!proxyTarget) {
    // In a local environment (not in Docker), this will default to 3000
    // This is for running `npm run dev` outside of the docker-compose setup.
    console.warn('VITE_API_TARGET is not set. Defaulting to http://localhost:3000');
  } else {
    console.log(`🎯 Vite proxy target set to: ${proxyTarget}`);
  }

  return {
    base: './',
    cacheDir: '.vite-cache',
    plugins: [react()],
    optimizeDeps: {
      exclude: ['@monaco-editor/react'],
    },
    server: {
      host: true, // Listen on all addresses, required for Docker
      proxy: {
        // Proxy all API requests
        '/api': {
          target: proxyTarget || 'http://localhost:3000',
          changeOrigin: true,
          secure: false,
        },
        // Explicitly proxy WebSocket connections
        '/ws': {
          target: (proxyTarget || 'http://localhost:3000').replace(/^http/, 'ws'),
          ws: true,
        },
      }
    }
  }
})
