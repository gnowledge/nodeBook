export function getServerAddress() {
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
