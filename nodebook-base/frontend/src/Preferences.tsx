import React from 'react';

interface PreferencesProps {
  strictMode: boolean;
  onStrictModeChange: (enabled: boolean) => void;
  onClose: () => void;
}

export function Preferences({ strictMode, onStrictModeChange, onClose }: PreferencesProps) {
  return (
    <div className="page-view-overlay" onClick={onClose}>
      <div className="page-view-content" onClick={(e) => e.stopPropagation()}>
        <button className="page-view-close-btn" onClick={onClose}>&times;</button>
        <h2>Preferences</h2>
        
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
