import React, { useState, useEffect, useRef } from 'react';
import { getApiBase } from './config';

const LogViewer = ({ 
  title = "System Logs", 
  showUserSpecific = false, 
  userId = null, 
  maxHeight = "400px",
  refreshInterval = 5000,
  isAdmin = false  // New prop to determine if user is admin
}) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [categories, setCategories] = useState([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [stats, setStats] = useState(null);
  const logsEndRef = useRef(null);

  const categoryColors = {
    AUDIT: '#2563eb',
    OPERATION: '#059669', 
    DEBUG: '#7c3aed',
    ERROR: '#dc2626',
    SECURITY: '#ea580c',
    PERFORMANCE: '#0891b2',
    ATOMIC: '#be185d',
    SYSTEM: '#6b7280'
  };

  // User-friendly category names
  const userFriendlyCategories = {
    'AUDIT': 'User Actions',
    'OPERATION': 'System Operations', 
    'DEBUG': 'Debug Info',
    'ERROR': 'Errors',
    'SECURITY': 'Security',
    'PERFORMANCE': 'Performance',
    'ATOMIC': 'System Actions',
    'SYSTEM': 'System Events'
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        limit: '100'
      });
      
      if (selectedCategory !== 'ALL') {
        params.append('category', selectedCategory);
      }
      
      // For regular users, only show their own logs
      if (!isAdmin && showUserSpecific && userId) {
        params.append('user_id', userId);
      }
      
      const response = await fetch(`${getApiBase()}/api/logs/recent?${params}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.statusText}`);
      }
      
      const data = await response.json();
      let filteredLogs = data.logs || [];
      
      // For regular users, filter out technical operations and only show CUD actions
      if (!isAdmin) {
        filteredLogs = filteredLogs.filter(log => {
          // Only show AUDIT logs for regular users (user actions)
          if (log.category !== 'AUDIT') {
            return false;
          }
          
          // Filter out technical operations
          const message = log.message?.toLowerCase() || '';
          const excludeTerms = [
            'api request',
            'get_',
            'fetch',
            'load',
            'read',
            'retrieve',
            'download',
            'export',
            'import',
            'health',
            'status',
            'ping'
          ];
          
          return !excludeTerms.some(term => message.includes(term));
        });
      }
      
      setLogs(filteredLogs);
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/logs/categories`);
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/logs/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.statistics);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const clearLogs = async () => {
    try {
      const response = await fetch(`${getApiBase()}/api/logs/clear`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error('Error clearing logs:', err);
    }
  };

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams({
        hours: '24'
      });
      
      if (!isAdmin && showUserSpecific && userId) {
        params.append('user_id', userId);
      }
      
      const response = await fetch(`${getApiBase()}/api/logs/export?${params}`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ndf_logs_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting logs:', err);
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchStats();
    fetchLogs();
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [selectedCategory, showUserSpecific, userId, isAdmin]);

  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchLogs();
        fetchStats();
      }, refreshInterval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getLogLevel = (category) => {
    switch (category) {
      case 'ERROR': return 'error';
      case 'SECURITY': return 'warning';
      case 'DEBUG': return 'debug';
      default: return 'info';
    }
  };

  const getUserFriendlyMessage = (log) => {
    // For admin users, show technical details
    if (isAdmin) {
      return log.message;
    }
    
    // For regular users, show simplified messages
    const message = log.message || '';
    
    // Remove technical prefixes and simplify
    let friendlyMessage = message
      .replace(/^API request: /, '')
      .replace(/^User activity detected during /, '')
      .replace(/^Failed to /, 'Error: ')
      .replace(/^Successfully /, '');
    
    return friendlyMessage;
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6 space-y-4 w-full">
      <div className="pb-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {isAdmin ? title : "Your Activity"}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`px-2 py-1 text-xs rounded ${
                autoRefresh 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {autoRefresh ? 'Auto' : 'Manual'}
            </button>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
            >
              {loading ? '...' : 'Refresh'}
            </button>
            {isAdmin && (
              <button
                onClick={clearLogs}
                className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200"
              >
                Clear
              </button>
            )}
            <button
              onClick={exportLogs}
              className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
            >
              Export
            </button>
          </div>
        </div>
        
        {/* Category Filter - only show for admin users */}
        {isAdmin && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-gray-600">Filter:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs border rounded px-2 py-1"
            >
              <option value="ALL">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.name} value={cat.name}>
                  {cat.display_name || cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Stats - simplified for regular users */}
        {stats && (
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-600">
            {isAdmin ? (
              <>
                <span>Total: {stats.total_logs}</span>
                <span>Last Hour: {stats.recent_activity?.last_hour || 0}</span>
                <span>Last 24h: {stats.recent_activity?.last_24_hours || 0}</span>
                {stats.by_category && Object.entries(stats.by_category).map(([cat, count]) => (
                  <span key={cat} style={{ color: categoryColors[cat] }}>
                    {userFriendlyCategories[cat] || cat}: {count}
                  </span>
                ))}
              </>
            ) : (
              <span>Recent activity: {stats.recent_activity?.last_24_hours || 0} actions in the last 24 hours</span>
            )}
          </div>
        )}
      </div>

      <div className="pt-0">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-800 rounded text-sm">
            {error}
          </div>
        )}

        <div 
          className="bg-gray-50 rounded border overflow-y-auto font-mono text-xs"
          style={{ maxHeight }}
        >
          {logs.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {loading ? 'Loading logs...' : (isAdmin ? 'No logs available' : 'No recent activity')}
            </div>
          ) : (
            <div className="p-2">
              {logs.map((log, index) => (
                <div
                  key={`${log.timestamp}-${index}`}
                  className={`mb-2 p-2 rounded border-l-4 ${
                    getLogLevel(log.category) === 'error' ? 'bg-red-50 border-red-400' :
                    getLogLevel(log.category) === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                    getLogLevel(log.category) === 'debug' ? 'bg-purple-50 border-purple-400' :
                    'bg-white border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isAdmin && (
                          <span 
                            className="px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ backgroundColor: categoryColors[log.category] || '#6b7280' }}
                          >
                            {log.category}
                          </span>
                        )}
                        <span className="text-gray-600">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        {isAdmin && log.user_id && (
                          <span className="text-blue-600 font-medium">
                            User: {log.user_id}
                          </span>
                        )}
                        {isAdmin && log.operation && (
                          <span className="text-green-600">
                            Op: {log.operation}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-800 mb-1">
                        {getUserFriendlyMessage(log)}
                      </div>
                      {isAdmin && log.error && (
                        <div className="text-red-700 bg-red-100 p-2 rounded text-xs">
                          <div><strong>Error:</strong> {log.error.error_type}</div>
                          <div>{log.error.error_message}</div>
                          {log.error.traceback && (
                            <details className="mt-1">
                              <summary className="cursor-pointer">Traceback</summary>
                              <pre className="mt-1 whitespace-pre-wrap">{log.error.traceback}</pre>
                            </details>
                          )}
                        </div>
                      )}
                      {isAdmin && log.duration && (
                        <div className="text-blue-600 text-xs">
                          Duration: {log.duration.toFixed(3)}s
                        </div>
                      )}
                      {isAdmin && log.transaction_id && (
                        <div className="text-purple-600 text-xs">
                          TX: {log.transaction_id}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogViewer; 