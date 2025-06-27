import React, { useState, useEffect } from 'react';
import { isTokenValid, checkUserActivity, getInactivityThreshold, getInactivityMessage } from '../utils/authUtils';

const AuthStatus = () => {
  const [tokenExpiry, setTokenExpiry] = useState(null);
  const [showWarning, setShowWarning] = useState(false);
  const [inactivityWarning, setInactivityWarning] = useState(false);
  const [lastActivityCheck, setLastActivityCheck] = useState(null);
  const [inactivityThreshold, setInactivityThreshold] = useState(20);

  useEffect(() => {
    // Load inactivity threshold from server
    const loadConfig = async () => {
      const threshold = await getInactivityThreshold();
      setInactivityThreshold(threshold);
    };
    loadConfig();

    const checkTokenExpiry = () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setTokenExpiry(null);
        setShowWarning(false);
        setInactivityWarning(false);
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
        setInactivityWarning(false);
      }
    };

    const checkInactivity = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const isActive = await checkUserActivity();
        if (!isActive) {
          setInactivityWarning(true);
          setShowWarning(false); // Don't show time-based warning if inactivity warning is shown
        } else {
          setInactivityWarning(false);
          setLastActivityCheck(new Date());
        }
      } catch (error) {
        console.error("Error checking user activity:", error);
        // Don't show inactivity warning on network errors
      }
    };

    // Check immediately
    checkTokenExpiry();
    checkInactivity();
    
    // Check every 30 seconds for token expiry
    const tokenInterval = setInterval(checkTokenExpiry, 30000);
    
    // Check every 2 minutes for inactivity
    const inactivityInterval = setInterval(checkInactivity, 120000);
    
    return () => {
      clearInterval(tokenInterval);
      clearInterval(inactivityInterval);
    };
  }, []);

  if (!showWarning && !inactivityWarning) return null;

  if (inactivityWarning) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded shadow-lg z-50">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium">
              Session expired due to inactivity
            </p>
            <p className="text-xs mt-1">
              You have been inactive for more than {getInactivityMessage(inactivityThreshold)}. 
              Please refresh the page to continue.
            </p>
          </div>
          <div className="ml-auto pl-3">
            <button
              onClick={() => {
                setInactivityWarning(false);
                window.location.reload();
              }}
              className="text-red-400 hover:text-red-600"
            >
              <span className="sr-only">Refresh</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

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
          {lastActivityCheck && (
            <p className="text-xs mt-1 text-yellow-600">
              Last activity: {lastActivityCheck.toLocaleTimeString()}
            </p>
          )}
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