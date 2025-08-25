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
  // In the packaged Electron app, the port is exposed by the preload script.
  const port = window.electronAPI?.getBackendPort();
  if (port) {
    apiBaseUrl = `http://localhost:${port}`;
  } else {
    console.error('Could not determine backend port from preload script.');
    // Fallback to a default port if something goes wrong
    apiBaseUrl = 'http://localhost:3000';
  }
}

export const API_BASE_URL = apiBaseUrl;