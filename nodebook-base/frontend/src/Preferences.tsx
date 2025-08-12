import React, { useState, useEffect } from 'react';

interface PreferencesProps {
  strictMode: boolean;
  onStrictModeChange: (enabled: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  onClose: () => void;
}

export function Preferences({ 
  strictMode, onStrictModeChange, 
  name, onNameChange,
  email, onEmailChange,
  onClose 
}: PreferencesProps) {
  const [currentName, setCurrentName] = useState(name);
  const [currentEmail, setCurrentEmail] = useState(email);
  const [dataPath, setDataPath] = useState('');

  useEffect(() => {
    setCurrentName(name);
    setCurrentEmail(email);
    window.electronAPI.settings.getDataPath().then(setDataPath);
  }, [name, email]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentName(e.target.value);
    onNameChange(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentEmail(e.target.value);
    onEmailChange(e.target.value);
  };

  const handleSetDataPath = async () => {
    const newPath = await window.electronAPI.settings.setDataPath();
    if (newPath) {
      setDataPath(newPath);
      // Optional: Show a dialog to the user informing them that a restart is required.
      alert('The data directory has been changed. Please restart the application for the changes to take effect.');
      window.electronAPI.app.relaunch();
    }
  };

  return (
    <div className="page-view-overlay" onClick={onClose}>
      <div className="page-view-content" onClick={(e) => e.stopPropagation()}>
        <button className="page-view-close-btn" onClick={onClose}>&times;</button>
        <h2>Preferences</h2>
        
        <div className="preferences-section">
          <h3>User</h3>
          <label>
            Name/Nick:
            <input type="text" value={currentName} onChange={handleNameChange} />
          </label>
          <label>
            Email:
            <input type="email" value={currentEmail} onChange={handleEmailChange} />
          </label>
        </div>

        <div className="preferences-section">
          <h3>Storage</h3>
          <label>
            Data Directory:
            <input type="text" value={dataPath} readOnly />
          </label>
          <button onClick={handleSetDataPath}>Change...</button>
          <p className="setting-description">
            The directory where your graph data is stored. The application must be restarted for changes to take effect.
          </p>
        </div>

        <div className="preferences-section">
          <h3>Editor Settings</h3>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={strictMode}
              onChange={(e) => onStrictModeChange(e.target.checked)}
            />
            <span className="slider"></span>
            Strict Schema Mode
          </label>
          <p className="setting-description">
            When enabled, you can only create relations and attributes that are defined in the Schema.
          </p>
        </div>

      </div>
    </div>
  );
}
