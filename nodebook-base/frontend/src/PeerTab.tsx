import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './api-config';

interface PeerTabProps {
  activeGraphId: string;
  graphKey: string | null;
}

export function PeerTab({ activeGraphId, graphKey }: PeerTabProps) {
  const [connections, setConnections] = useState(0);
  const [remoteKey, setRemoteKey] = useState('');

  const authenticatedFetch = (url: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };
    if (options.body) {
      headers['Content-Type'] = 'application/json';
    }
    return fetch(url, { ...options, headers });
  };

  const fetchPeerStatus = async () => {
    if (!activeGraphId) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/peers`);
      if (res.ok) {
        const data = await res.json();
        setConnections(data.connections || 0);
      } else {
        console.warn('Failed to fetch peer status:', res.status);
        setConnections(0);
      }
    } catch (error) {
      console.error('Error fetching peer status:', error);
      setConnections(0);
    }
  };

  useEffect(() => {
    const interval = setInterval(fetchPeerStatus, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [activeGraphId]);

  const handleSync = async () => {
    const keyToSync = remoteKey.trim();
    if (!keyToSync) return;
    try {
      const res = await authenticatedFetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/peers/sync`, {
        method: 'POST',
        body: JSON.stringify({ remoteKey: keyToSync }),
      });
      if (res.ok) {
        setRemoteKey('');
        console.log('Sync initiated successfully');
      } else {
        console.error('Failed to initiate sync:', res.status);
      }
    } catch (error) {
      console.error('Error initiating sync:', error);
    }
  };

  return (
    <div className="peer-tab">
      <div className="peer-status">
        <h3>Connectivity</h3>
        <p>Connected Peers: <strong>{connections}</strong></p>
      </div>
      <div className="share-graph">
        <h3>Share Your Graph</h3>
        <p>Share this key with a peer to let them sync with your graph:</p>
        <div className="share-key">
          {graphKey ? (
            <>
              <input type="text" readOnly value={graphKey} />
              <button onClick={() => navigator.clipboard.writeText(graphKey)}>Copy Key</button>
            </>
          ) : (
            <div className="key-generating">
              <span>🔄 Generating key for graph...</span>
            </div>
          )}
        </div>
      </div>
      <div className="sync-graph">
        <h3>Sync with a Peer</h3>
        <p>Paste a key from a peer to sync with their graph:</p>
        <div className="sync-form">
          <input
            type="text"
            value={remoteKey}
            onChange={(e) => setRemoteKey(e.target.value)}
            placeholder="Enter peer's graph key..."
          />
          <button onClick={handleSync}>Sync</button>
        </div>
      </div>
    </div>
  );
}