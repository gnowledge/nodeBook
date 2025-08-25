import React, { useState, useEffect } from 'react';
import { GraphCard } from './GraphCard';
import { TopBar } from './TopBar';
import type { Graph, PublicGraph } from './types';
import styles from './Dashboard.module.css';

interface DashboardProps {
  token: string | null;
  user: any;
  onLogout: () => void;
  onGoToApp: () => void;
  onShowAuth: () => void;
  onViewPublicGraph: (graphId: string) => void;
  isAuthenticated: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ token, user, onLogout, onGoToApp, onShowAuth, onViewPublicGraph, isAuthenticated }) => {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [publicGraphs, setPublicGraphs] = useState<PublicGraph[]>([]);
  const [loading, setLoading] = useState(false);
  const [publicLoading, setPublicLoading] = useState(false);
  const [error, setError] = useState('');
  const [publicError, setPublicError] = useState('');

  const fetchGraphs = async () => {
    if (!token) {
      setGraphs([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/graphs', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setGraphs(data || []);
      } else {
        setError('Failed to fetch graphs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicGraphs = async () => {
    setPublicLoading(true);
    setPublicError('');
    
    try {
      const response = await fetch('/api/public/graphs');
      
      if (response.ok) {
        const data = await response.json();
        setPublicGraphs(data || []);
      } else {
        setPublicError('Failed to fetch public graphs');
      }
    } catch (err) {
      setPublicError('Network error');
    } finally {
      setPublicLoading(false);
    }
  };

  const updatePublicationState = async (graphId: string, newState: 'Private' | 'P2P' | 'Public') => {
    try {
      const response = await fetch(`/api/graphs/${graphId}/publication`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ publication_state: newState }),
      });
      
      if (response.ok) {
        // Refresh graphs to show updated state
        await fetchGraphs();
        // Refresh public graphs if the graph was made public/private
        await fetchPublicGraphs();
      } else {
        alert('Failed to update publication state');
      }
    } catch (err) {
      alert('Error updating publication state');
    }
  };

  useEffect(() => {
    fetchGraphs();
    fetchPublicGraphs();
  }, [token]);

  return (
    <div className={styles.container}>
      <TopBar
        isAuthenticated={isAuthenticated}
        user={user}
        onGoToDashboard={() => {}} // Already on dashboard
        onGoToApp={onGoToApp}
        onShowAuth={onShowAuth}
        onLogout={onLogout}
        currentView="dashboard"
      />
      
      <div className={styles.content}>
        <div>
          {/* Header */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h1 className={styles.sectionTitle}>
                  NodeBook Dashboard
                </h1>
                {isAuthenticated && user ? (
                  <p className={styles.sectionSubtitle}>
                    Welcome back, {user.username}! (Admin: {user.isAdmin ? 'Yes' : 'No'})
                  </p>
                ) : (
                  <p className={styles.sectionSubtitle}>
                    Discover and explore graphs. Sign in to create your own.
                  </p>
                )}
              </div>
              <div className={styles.sectionActions}>
                {isAuthenticated ? (
                  <button
                    onClick={onGoToApp}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Go to NodeBook
                  </button>
                ) : (
                  <button
                    onClick={onShowAuth}
                    className={`${styles.button} ${styles.buttonPrimary}`}
                  >
                    Sign In
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* User Graphs Section - Only show when authenticated */}
          {isAuthenticated && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Your Graphs
              </h2>
              
              {loading && (
                <div className={styles.centerContent}>
                  <div className={styles.loadingText}>Loading graphs...</div>
                </div>
              )}
              
              {error && (
                <div className={styles.centerContent}>
                  <div className={styles.errorText}>Error: {error}</div>
                </div>
              )}
              
              {!loading && !error && graphs.length === 0 && (
                <div className={styles.centerContent}>
                  <div className={styles.emptyText}>No graphs found</div>
                  <p className={styles.emptySubtext}>
                    This is expected for a new user. The backend is working correctly!
                  </p>
                </div>
              )}
              
              {!loading && !error && graphs.length > 0 && (
                <div className={`${styles.grid} ${styles.grid1Col}`}>
                  {graphs.map((graph) => (
                    <GraphCard
                      key={graph.id}
                      graph={graph}
                      onClick={(graphId) => {
                        // Navigate to the graph in the app
                        onGoToApp();
                      }}
                      showPublicationControls={true}
                      onPublicationStateChange={updatePublicationState}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Public Graphs Section */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              Public Graphs
            </h2>
            
            {publicLoading && (
              <div className={styles.centerContent}>
                <div className={styles.loadingText}>Loading public graphs...</div>
              </div>
            )}
            
            {publicError && (
              <div className={styles.centerContent}>
                <div className={styles.centerContent}>
                  <div className={styles.errorText}>Error: {publicError}</div>
                </div>
              </div>
            )}
            
            {!publicLoading && !publicError && publicGraphs.length === 0 && (
              <div className={styles.centerContent}>
                <div className={styles.emptyText}>No public graphs available</div>
                <p className={styles.emptySubtext}>
                  Public graphs from other users will appear here.
                </p>
              </div>
            )}
            
            {!publicLoading && !publicError && publicGraphs.length > 0 && (
              <div className={`${styles.grid} ${styles.grid1Col}`}>
                {publicGraphs.map((graph) => (
                  <GraphCard
                    key={graph.id}
                    graph={graph}
                    onClick={(graphId) => {
                      if (isAuthenticated) {
                        // Navigate to the graph in the app for authenticated users
                        onGoToApp();
                      } else {
                        // For anonymous users, navigate to the public graph viewer
                        onViewPublicGraph(graphId);
                      }
                    }}
                    isPublic={true}
                    showPublicationControls={false}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Token Info (for debugging) - Only show when authenticated */}
          {isAuthenticated && token && user && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>
                Debug Info
              </h2>
              <div className="text-sm text-gray-600">
                <p><strong>JWT Token:</strong> {token.substring(0, 50)}...</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Username:</strong> {user.username}</p>
                <p><strong>Is Admin:</strong> {user.isAdmin ? 'Yes' : 'No'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Footer */}
      <footer className={styles.footer}>
        <p>
          NodeBook is free and open source software released under{' '}
          <a 
            href="https://github.com/gnowledge/nodeBook" 
            target="_blank" 
            rel="noopener noreferrer"
            className={styles.footerLink}
          >
            AGPL
          </a>
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;
