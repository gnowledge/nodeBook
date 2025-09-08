import React, { useState, useEffect } from 'react';
import styles from './Preferences.module.css';

interface PreferencesProps {
  name: string;
  onNameChange: (name: string) => void;
  email: string;
  onEmailChange: (email: string) => void;
  defaultGraphMode: 'markdown' | 'mindmap' | 'richgraph' | 'strictgraph';
  onDefaultGraphModeChange: (mode: 'markdown' | 'mindmap' | 'richgraph' | 'strictgraph') => void;
  onClose: () => void;
}

export function Preferences({ 
  name, onNameChange,
  email, onEmailChange,
  defaultGraphMode, onDefaultGraphModeChange,
  onClose 
}: PreferencesProps) {
  const [currentName, setCurrentName] = useState(name);
  const [currentEmail, setCurrentEmail] = useState(email);
  const [currentDefaultMode, setCurrentDefaultMode] = useState<'markdown' | 'mindmap' | 'richgraph' | 'strictgraph'>(defaultGraphMode);

  useEffect(() => {
    setCurrentName(name);
    setCurrentEmail(email);
    setCurrentDefaultMode(defaultGraphMode);
  }, [name, email, defaultGraphMode]);

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
          <h3>Defaults</h3>
          <label>
            Default Graph Mode:
            <select
              value={currentDefaultMode}
              onChange={(e) => {
                const mode = e.target.value as 'markdown' | 'mindmap' | 'richgraph' | 'strictgraph';
                setCurrentDefaultMode(mode);
                onDefaultGraphModeChange(mode);
              }}
            >
              <option value="markdown">📝 Markdown (Document)</option>
              <option value="richgraph">🔗 Rich Graph (Advanced)</option>
              <option value="mindmap">🧠 MindMap (Beginner)</option>
              <option value="strictgraph">✅ StrictGraph (Schema-checked)</option>
            </select>
          </label>
          <p className={styles.settingDescription}>
            Used as the default when creating new graphs. You can change it per graph in the editor later.
          </p>
        </div>

      </div>
    </div>
  );
}