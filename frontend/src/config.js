export function getServerAddress() {
  // Check if LOCAL_BACKEND is enabled
  const isLocalBackend = import.meta.env.VITE_LOCAL_BACKEND === 'true';
  
  if (isLocalBackend) {
    // When LOCAL_BACKEND is true, use window.location.origin as default
    // This assumes the backend is running on the same origin as the frontend
    return window.location.origin;
  }
  
  // Otherwise, use the stored server address or default
  return (
    localStorage.getItem('serverAddress') ||
    (typeof window !== 'undefined' && window.SERVER_ADDRESS) ||
    'https://api.nodeBook.in'
  );
}

export function getApiBase() {
  return getServerAddress();
}

export function getAuthBase() {
  return `${getApiBase()}/api/auth`;
}

// Helper function to check if LOCAL_BACKEND is enabled
export function isLocalBackend() {
  return import.meta.env.VITE_LOCAL_BACKEND === 'true';
}
