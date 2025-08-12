import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from './api-config';

interface PeerTabProps {
  activeGraphId: string;
  graphKey: string | null;
}

export function PeerTab({ activeGraphId, graphKey }: PeerTabProps) {
  const [connections, setConnections] = useState(0);
  const [remoteKey, setRemoteKey] = useState('');

  const fetchPeerStatus = async () => {
    if (!activeGraphId) return;
    const res = await fetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/peers`);
    const data = await res.json();
    setConnections(data.connections || 0);
  };

  useEffect(() => {
    const interval = setInterval(fetchPeerStatus, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, [activeGraphId]);

  const handleSync = async () => {
    const keyToSync = remoteKey.trim();
    if (!keyToSync) return;
    await fetch(`${API_BASE_URL}/api/graphs/${activeGraphId}/peers/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remoteKey: keyToSync }),
    });
    setRemoteKey('');
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
          <input type="text" readOnly value={graphKey || 'Loading...'} />
          <button onClick={() => navigator.clipboard.writeText(graphKey || '')}>Copy Key</button>
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