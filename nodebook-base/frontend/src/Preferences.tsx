import React, { useState, useEffect } from 'react';
import styles from './Preferences.module.css';

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
    <div className={styles.preferencesOverlay} onClick={onClose}>
      <div className={styles.preferencesContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.preferencesCloseBtn} onClick={onClose}>&times;</button>
        
        <div className={styles.preferencesHeader}>
          <h2>Preferences</h2>
        </div>
        
        <div className={styles.preferencesSection}>
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

        <div className={styles.preferencesSection}>
          <h3>Editor Settings</h3>
          <div className={styles.toggleSwitch}>
            <label className={styles.toggleLabel}>
              Strict Schema Mode
            </label>
            <div className={styles.toggleContainer}>
              <input
                type="checkbox"
                checked={strictMode}
                onChange={(e) => onStrictModeChange(e.target.checked)}
                className={styles.toggleInput}
              />
              <span className={styles.slider}></span>
            </div>
          </div>
          <p className={styles.settingDescription}>
            When enabled, you can only create relations and attributes that are defined in the Schema.
          </p>
        </div>

      </div>
    </div>
  );
}