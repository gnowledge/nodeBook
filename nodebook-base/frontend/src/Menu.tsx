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

  const handleExamplesRedirect = () => {
    onSelectPage('Help');
    setIsOpen(false);
  };

  return (
    <div className={styles.menuContainer}>
      <button onClick={() => setIsOpen(!isOpen)} className={styles.menuButton}>
        <img src={hamburgerIcon} alt="Menu" className={styles.menuIcon} />
      </button>

      {isOpen && (
        <div className={styles.menuDropdown}>
          <a href="#" onClick={() => handleSelect('Preferences')}>Preferences</a>
          <div className={styles.menuDivider}></div>
          <div className={styles.menuHeader}>Examples</div>
          <a href="#" onClick={handleExamplesRedirect}>View Examples in Help</a>
        </div>
      )}
    </div>
  );
}
