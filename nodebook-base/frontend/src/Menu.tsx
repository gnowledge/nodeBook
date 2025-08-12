import React, { useState } from 'react';

interface MenuProps {
  onSelectPage: (page: string) => void;
}

export function Menu({ onSelectPage }: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (page: string) => {
    onSelectPage(page);
    setIsOpen(false);
  };

  return (
    <div className="menu-container">
      <button onClick={() => setIsOpen(!isOpen)} className="menu-button">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="12" x2="21" y2="12"></line>
          <line x1="3" y1="6" x2="21" y2="6"></line>
          <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>
      </button>

      {isOpen && (
        <div className="menu-dropdown">
          <a href="#" onClick={() => handleSelect('About')}>About</a>
          <a href="#" onClick={() => handleSelect('Preferences')}>Preferences</a>
          <a href="#" onClick={() => handleSelect('Help')}>Help</a>
          <a href="#" onClick={() => handleSelect('SourceCode')}>Source Code</a>
          <div className="menu-divider"></div>
          <div className="menu-header">Examples</div>
          <a href="#" onClick={() => handleSelect('introduction.cnl')}>Introduction</a>
          <a href="#" onClick={() => handleSelect('example.cnl')}>Simple Example</a>
          <a href="#" onClick={() => handleSelect('rea_example.cnl')}>REA Example</a>
          <a href="#" onClick={() => handleSelect('transition_example.cnl')}>Transition Example</a>
        </div>
      )}
    </div>
  );
}
