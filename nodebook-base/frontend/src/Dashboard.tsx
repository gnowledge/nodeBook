import React, { useState, useEffect } from 'react';
import { GraphCard } from './GraphCard';
import type { Graph, PublicGraph } from './types';

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

  const testProtectedEndpoint = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(`Current user: ${data.username} (ID: ${data.id})`);
      } else {
        alert('Failed to get user info');
      }
    } catch (err) {
      alert('Error testing endpoint');
    }
  };

  useEffect(() => {
    // Only fetch user graphs if authenticated
    if (isAuthenticated && token) {
      fetchGraphs();
    }
    // Always fetch public graphs
    fetchPublicGraphs();
  }, [token, isAuthenticated]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                NodeBook Dashboard
              </h1>
              {isAuthenticated && user ? (
                <p className="text-gray-600 mt-2">
                  Welcome back, {user.username}! (Admin: {user.isAdmin ? 'Yes' : 'No'})
                </p>
              ) : (
                <p className="text-gray-600 mt-2">
                  Discover and explore graphs. Sign in to create your own.
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={onGoToApp}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                  >
                    Go to NodeBook
                  </button>
                  <button
                    onClick={onLogout}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <button
                  onClick={onShowAuth}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>

        {/* API Testing Section - Only show when authenticated */}
        {isAuthenticated && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              API Testing
            </h2>
            <div className="space-y-4">
              <button
                onClick={testProtectedEndpoint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Test /api/auth/me
              </button>
              <button
                onClick={fetchGraphs}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md ml-4"
              >
                Refresh User Graphs
              </button>
              <button
                onClick={fetchPublicGraphs}
                className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md ml-4"
              >
                Refresh Public Graphs
              </button>
            </div>
          </div>
        )}

        {/* User Graphs Section - Only show when authenticated */}
        {isAuthenticated && (
          <div className="bg-white shadow rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Your Graphs
            </h2>
            
            {loading && (
              <div className="text-center py-8">
                <div className="text-gray-600">Loading graphs...</div>
              </div>
            )}
            
            {error && (
              <div className="text-center py-8">
                <div className="text-red-600">Error: {error}</div>
              </div>
            )}
            
            {!loading && !error && graphs.length === 0 && (
              <div className="text-center py-8">
                <div className="text-gray-600">No graphs found</div>
                <p className="text-sm text-gray-500 mt-2">
                  This is expected for a new user. The backend is working correctly!
                </p>
              </div>
            )}
            
            {!loading && !error && graphs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Public Graphs
          </h2>
          
          {publicLoading && (
            <div className="text-center py-8">
              <div className="text-gray-600">Loading public graphs...</div>
            </div>
          )}
          
          {publicError && (
            <div className="text-center py-8">
              <div className="text-center py-8">
                <div className="text-red-600">Error: {publicError}</div>
              </div>
            </div>
          )}
          
          {!publicLoading && !publicError && publicGraphs.length === 0 && (
            <div className="text-center py-8">
              <div className="text-gray-600">No public graphs available</div>
              <p className="text-sm text-gray-500 mt-2">
                Public graphs from other users will appear here.
              </p>
            </div>
          )}
          
          {!publicLoading && !publicError && publicGraphs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
          <div className="bg-white shadow rounded-lg p-6 mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
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
  );
};

export default Dashboard;
