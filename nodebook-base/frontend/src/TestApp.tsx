import React, { useState, useEffect } from 'react';
import Dashboard from './Dashboard';
import App from './App';
import AuthModal from './AuthModal';
import { PublicGraphViewer } from './PublicGraphViewer';
import { keycloakAuth } from './services/keycloakAuth';
import styles from './TestApp.module.css';

interface User {
  id: string;
  username: string;
  isAdmin?: boolean;
  email?: string;
}

function TestApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'app' | 'public-graph'>('dashboard');
  const [publicGraphId, setPublicGraphId] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthOnLoad = async () => {
      // If redirected from Keycloak with ?code=..., complete OAuth flow
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const error = urlParams.get('error');

      if (error) {
        // Failed auth redirect; just continue to unauthenticated state
        setLoading(false);
        return;
      }

      if (code) {
        try {
          const result = await keycloakAuth.handleCallback();
          if (result) {
            keycloakAuth.storeAuth(result.token, result.user);
            setIsAuthenticated(true);
            setToken(result.token);
            setUser(result.user);
            setLoading(false);
            return;
          }
        } catch {
          // Fall through to stored token check
        }
      }

      // No OAuth code in URL; fall back to stored token check
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        // Verify token is still valid
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${storedToken}` },
        })
          .then((res) => {
            if (res.ok) {
              setIsAuthenticated(true);
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
            } else {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
          })
          .catch(() => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          })
          .finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    };

    handleAuthOnLoad();
  }, []);

  const handleLogin = (newToken: string, userData: User) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setToken(newToken);
    setUser(userData);
    setShowAuthModal(false);
  };

  const handleGoToApp = (graphId?: string) => {
    setCurrentView('app');
    // Store the selected graph ID to pass to App component
    if (graphId) {
      localStorage.setItem('selectedGraphId', graphId);
    }
  };

  const handleGoToDashboard = () => {
    setCurrentView('dashboard');
    setPublicGraphId(null);
  };

  const handleViewPublicGraph = (graphId: string) => {
    setPublicGraphId(graphId);
    setCurrentView('public-graph');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setToken(null);
    setUser(null);
    // Ensure we return to Dashboard view
    setCurrentView('dashboard');
    setPublicGraphId(null);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>Loading...</p>
        </div>
      </div>
    );
  }

  // Always show Dashboard as the main component
  if (currentView === 'dashboard') {
    return (
      <>
        <Dashboard 
          token={token} 
          user={user} 
          onLogout={handleLogout}
          onGoToApp={handleGoToApp}
          onShowAuth={() => setShowAuthModal(true)}
          onViewPublicGraph={handleViewPublicGraph}
          isAuthenticated={isAuthenticated}
        />
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
          onLogin={handleLogin} 
        />
      </>
    );
  }

  // Show App when navigating from Dashboard
  if (currentView === 'app') {
    return (
      <App 
        onLogout={handleLogout} 
        onGoToDashboard={handleGoToDashboard}
        user={user}
      />
    );
  }

  // Show Public Graph Viewer for anonymous users
  if (currentView === 'public-graph' && publicGraphId) {
    return (
      <PublicGraphViewer
        graphId={publicGraphId}
        onGoToDashboard={handleGoToDashboard}
        onShowAuth={() => setShowAuthModal(true)}
      />
    );
  }

  // Default to Dashboard
  return (
    <>
      <Dashboard 
        token={token} 
        user={user} 
        onLogout={handleLogout}
        onGoToApp={handleGoToApp}
        onShowAuth={() => setShowAuthModal(true)}
        onViewPublicGraph={handleViewPublicGraph}
        isAuthenticated={isAuthenticated}
      />
      <AuthModal 
        isOpen={showAuthModal} 
        onClose={() => setShowAuthModal(false)} 
        onLogin={handleLogin} 
      />
    </>
  );
}

export default TestApp;
