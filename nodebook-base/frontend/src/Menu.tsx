import React, { useState } from 'react';
import styles from './Menu.module.css';
import hamburgerIcon from './assets/Hamburger_icon.svg.png';

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
    <div className={styles.menuContainer}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.menuButton}>
        <img src={hamburgerIcon} alt="Menu" className={styles.menuIcon} />
      </button>

      {isOpen && (
        <div className={styles.menuDropdown}>
          <a href="#" onClick={() => handleSelect('About')}>About</a>
          <a href="#" onClick={() => handleSelect('Preferences')}>Preferences</a>
          <a href="#" onClick={() => handleSelect('Help')}>Help</a>
          <a href="#" onClick={() => handleSelect('SourceCode')}>Source Code</a>
          <div className={styles.menuDivider}></div>
          <div className={styles.menuHeader}>Examples</div>
          <a href="#" onClick={() => handleSelect('introduction.cnl')}>Introduction</a>
          <a href="#" onClick={() => handleSelect('example.cnl')}>Simple Example</a>
          <a href="#" onClick={() => handleSelect('rea_example.cnl')}>REA Example</a>
          <a href="#" onClick={() => handleSelect('transition_example.cnl')}>Transition Example</a>
        </div>
      )}
    </div>
  );
}
