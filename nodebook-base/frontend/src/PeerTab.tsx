import React, { useState, useEffect } from 'react';

interface PeerTabProps {
  activeGraphId: string;
  graphKey: string | null;
}

export function PeerTab({ activeGraphId, graphKey }: PeerTabProps) {
  const [connections, setConnections] = useState(0);
  const [remoteKey, setRemoteKey] = useState('');

  // The concept of polling for peer status needs to be re-implemented.
  // A better approach would be for the main process to emit events.
  // For now, we will disable the polling.

  const handleListen = async () => {
    if (activeGraphId) {
      await window.electronAPI.p2p.listen(activeGraphId);
      alert('Now listening for P2P connections.');
    }
  };

  const handleSync = async () => {
    const keyToSync = remoteKey.trim();
    if (!keyToSync) return;
    await window.electronAPI.p2p.sync(keyToSync);
    setRemoteKey('');
    alert(`Started syncing with key: ${keyToSync.slice(0, 10)}...`);
  };

  return (
    <div className="peer-tab">
      <div className="peer-status">
        <h3>Connectivity</h3>
        <p>Connected Peers: <strong>{connections}</strong> (real-time status not implemented)</p>
        <button onClick={handleListen}>Start Listening for Peers</button>
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