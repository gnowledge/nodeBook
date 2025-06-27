// Authentication utility functions for better error handling and token management

// Check if token is valid (not expired)
export const isTokenValid = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;
  
  try {
    // Decode JWT token to check expiration
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Date.now() / 1000;
    return payload.exp > currentTime;
  } catch (error) {
    console.error("Error parsing token:", error);
    return false;
  }
};

// Get token with validation
export const getValidToken = () => {
  if (!isTokenValid()) {
    // Clear invalid token
    localStorage.removeItem("token");
    return null;
  }
  return localStorage.getItem("token");
};

// Enhanced fetch with authentication error handling
export const authenticatedFetch = async (url, options = {}) => {
  const token = getValidToken();
  if (!token) {
    throw new Error("No valid authentication token");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      "Authorization": `Bearer ${token}`
    }
  });

  // Handle authentication errors
  if (response.status === 401 || response.status === 403) {
    // Check if it's an inactivity error by looking at the response
    try {
      const errorData = await response.json();
      if (errorData.detail && errorData.detail.includes("inactivity")) {
        throw new Error("Session expired due to inactivity. Please log in again.");
      }
    } catch (parseError) {
      // If we can't parse the error, use generic message
    }
    
    // Clear invalid token
    localStorage.removeItem("token");
    throw new Error("Authentication failed. Please log in again.");
  }

  return response;
};

// Safe JSON parsing with error handling
export const safeJsonParse = async (response) => {
  try {
    return await response.json();
  } catch (error) {
    console.error("Error parsing JSON response:", error);
    throw new Error("Invalid response format");
  }
};

// Retry mechanism for failed requests
export const retryFetch = async (fetchFn, maxRetries = 2) => {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (i === maxRetries) throw error;
      
      // Wait before retrying (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
};

// Refresh graph data with error handling
export const refreshGraphData = async (userId, graphId) => {
  try {
    const response = await authenticatedFetch(`/api/ndf/users/${userId}/graphs/${graphId}/polymorphic_composed`);
    return await safeJsonParse(response);
  } catch (err) {
    console.error('Failed to refresh graph data:', err);
    throw err;
  }
};

// Refresh node data with error handling
export const refreshNodeData = async (userId, graphId, nodeId) => {
  try {
    const response = await authenticatedFetch(`/api/ndf/users/${userId}/graphs/${graphId}/getInfo/${nodeId}`);
    return await safeJsonParse(response);
  } catch (err) {
    console.error('Failed to refresh node data:', err);
    throw err;
  }
};

// Check if user has been inactive (for inactivity-based token expiration)
export const checkUserActivity = async () => {
  try {
    const token = getValidToken();
    if (!token) return false;
    
    // Make a simple API call to check if token is still valid
    const response = await fetch('/api/auth/whoami', {
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error checking user activity:', error);
    return false;
  }
};

// Get inactivity threshold from server (if available)
export const getInactivityThreshold = async () => {
  try {
    const response = await fetch('/api/auth/config');
    if (response.ok) {
      const config = await response.json();
      return config.inactivity_threshold_minutes || 20;
    }
  } catch (error) {
    console.error('Error fetching auth config:', error);
  }
  // Default to 20 minutes if not configured
  return 20; // minutes
};

// Format inactivity message
export const getInactivityMessage = (minutes) => {
  if (minutes < 1) {
    return "less than a minute";
  } else if (minutes === 1) {
    return "1 minute";
  } else {
    return `${minutes} minutes`;
  }
}; 