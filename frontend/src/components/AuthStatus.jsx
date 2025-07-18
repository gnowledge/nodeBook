import React, { useState, useEffect } from 'react';
import { isTokenValid } from '../utils/authUtils';

const AuthStatus = () => {
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkTokenExpiry = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setTokenExpiry(null);
        setShowWarning(false);
        return;
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Date.now() / 1000;
        const timeUntilExpiry = payload.exp - currentTime;
        
        setTokenExpiry(timeUntilExpiry);
        
        // Show warning if token expires in less than 5 minutes
        if (timeUntilExpiry < 300 && timeUntilExpiry > 0) {
          setShowWarning(true);
        } else {
          setShowWarning(false);
        }
      } catch (error) {
        console.error("Error parsing token:", error);
        setTokenExpiry(null);
        setShowWarning(false);
      }
    };

    // Check immediately
    checkTokenExpiry();
    
    // Check every 30 seconds for token expiry
    const tokenInterval = setInterval(checkTokenExpiry, 30000);
    
    return () => {
      clearInterval(tokenInterval);
    };
  }, []);

  if (!showWarning) return null;

  const minutes = Math.floor(tokenExpiry / 60);
  const seconds = Math.floor(tokenExpiry % 60);

  return (
    <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded shadow-lg z-50">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm font-medium">
            Session expires in {minutes}:{seconds.toString().padStart(2, '0')}
          </p>
          <p className="text-xs mt-1">
            Please save your work and refresh the page to continue.
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setShowWarning(false)}
            className="text-yellow-400 hover:text-yellow-600"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthStatus; 