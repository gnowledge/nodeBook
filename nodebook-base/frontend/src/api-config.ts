// This utility determines the base URL for API calls.

// TypeScript needs to know about the API object exposed by the preload script.
declare global {
  interface Window {
    electronAPI: {
      getBackendPort: () => string;
    };
  }
}

let apiBaseUrl = '';

if (import.meta.env.DEV) {
  // In development, Vite's proxy handles API requests.
  // We use a relative path, and the proxy forwards it.
  apiBaseUrl = '';
  console.log('🔧 Development mode: Using relative paths with Vite proxy');
  console.log('🔧 API_BASE_URL set to:', apiBaseUrl);
} else {
  // Production: if running inside Electron, use preload-provided port; otherwise, use relative paths
  const port = window.electronAPI && typeof window.electronAPI.getBackendPort === 'function'
    ? window.electronAPI.getBackendPort()
    : undefined;
  if (port) {
    apiBaseUrl = `http://localhost:${port}`;
    console.log('🔧 Production (Electron): Using preload port for API base URL:', apiBaseUrl);
  } else {
    // Browser (deployed site): rely on same-origin reverse proxy (relative paths)
    apiBaseUrl = '';
    console.log('🔧 Production (Web): Using relative paths for API base URL');
  }
}

export const API_BASE_URL = apiBaseUrl;