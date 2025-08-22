import React, { useState, useEffect } from 'react';

interface DashboardProps {
  token: string;
  user: any;
  onLogout: () => void;
  onGoToApp: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ token, user, onLogout, onGoToApp }) => {
  const [graphs, setGraphs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchGraphs = async () => {
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
        setGraphs(data.graphs || []);
      } else {
        setError('Failed to fetch graphs');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
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
    fetchGraphs();
  }, [token]);

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
              <p className="text-gray-600 mt-2">
                Welcome back, {user.username}! (Admin: {user.isAdmin ? 'Yes' : 'No'})
              </p>
            </div>
            <div className="flex space-x-3">
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
            </div>
          </div>
        </div>

        {/* API Testing Section */}
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
              Refresh Graphs
            </button>
          </div>
        </div>

        {/* Graphs Section */}
        <div className="bg-white shadow rounded-lg p-6">
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
                <div key={graph.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{graph.name}</h3>
                  <p className="text-sm text-gray-600">{graph.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Token Info (for debugging) */}
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
      </div>
    </div>
  );
};

export default Dashboard;
