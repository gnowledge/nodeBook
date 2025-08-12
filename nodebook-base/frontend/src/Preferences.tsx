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

  useEffect(() => {
    setCurrentName(name);
    setCurrentEmail(email);
  }, [name, email]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentName(e.target.value);
    onNameChange(e.target.value);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentEmail(e.target.value);
    onEmailChange(e.target.value);
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