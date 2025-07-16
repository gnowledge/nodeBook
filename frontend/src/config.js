export function getServerAddress() {
  return (
    localStorage.getItem('serverAddress') ||
    (typeof window !== 'undefined' && window.SERVER_ADDRESS) ||
    'https://api.nodeBook.in'
  );
}

export const API_BASE = getServerAddress();
export const AUTH_BASE = `${API_BASE}/api/auth`;
