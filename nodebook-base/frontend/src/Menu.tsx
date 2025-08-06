import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface MenuProps {
  graphKey: string | null;
  strictMode: boolean;
  onStrictModeChange: (enabled: boolean) => void;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export function Menu({ graphKey, strictMode, onStrictModeChange, theme, onThemeChange }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [helpContent, setHelpContent] = useState('');

  useEffect(() => {
    if (isOpen && !helpContent) {
      // Fetch help content only when the menu is opened for the first time
      fetch('/CNL-Help.md')
        .then(res => res.text())
        .then(text => setHelpContent(text));
    }
  }, [isOpen, helpContent]);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <div className="menu-container">
      <button onClick={toggleMenu} className="menu-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="1"></circle>
          <circle cx="12" cy="5" r="1"></circle>
          <circle cx="12" cy="19" r="1"></circle>
        </svg>
      </button>

      {isOpen && (
        <div className="modal-overlay" onClick={toggleMenu}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={toggleMenu}>&times;</button>
            <h2>Menu</h2>
            
            <div className="menu-section">
              <h3>Share Graph</h3>
              {graphKey ? (
                <div className="share-key">
                  <input type="text" readOnly value={graphKey} />
                  <button onClick={() => navigator.clipboard.writeText(graphKey)}>Copy Key</button>
                </div>
              ) : (
                <p>Select a graph to see its sharing key.</p>
              )}
            </div>

            <div className="menu-section">
              <h3>Settings</h3>
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
              <div className="theme-selector">
                <span>Theme:</span>
                <select value={theme} onChange={(e) => onThemeChange(e.target.value)}>
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="high-contrast">High Contrast</option>
                </select>
              </div>
            </div>

            <div className="menu-section">
              <h3>Help</h3>
              <div className="help-content">
                <ReactMarkdown>{helpContent}</ReactMarkdown>
              </div>
            </div>

            <div className="menu-section">
              <h3>About</h3>
              <p>NodeBook is a peer-to-peer, collaborative graph authoring tool.</p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
