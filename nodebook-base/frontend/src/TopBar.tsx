import React from 'react';
import styles from './TopBar.module.css';

interface TopBarProps {
  isAuthenticated: boolean;
  user: any;
  onGoToDashboard: () => void;
  onGoToApp: () => void;
  onShowAuth: () => void;
  onLogout: () => void;
  currentView: 'dashboard' | 'app' | 'public-graph';
  onSelectPage?: (page: string) => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  isAuthenticated,
  user,
  onGoToDashboard,
  onGoToApp,
  onShowAuth,
  onLogout,
  currentView,
  onSelectPage
}) => {
  return (
    <div className={styles.topBarPersistent}>
      <div className={styles.topBarLeft}>
        <button
          onClick={onGoToDashboard}
          className={styles.homeButton}
          title="Go to Dashboard"
        >
          🏠
        </button>
        <button
          onClick={onGoToDashboard}
          className={styles.appTitle}
          title="Go to Dashboard"
        >
          NodeBook
        </button>
      </div>

      <div className={styles.topBarCenter}>
        <nav className={styles.navigationMenu}>
          {isAuthenticated && (
            <button
              onClick={onGoToApp}
              className={`${styles.navItem} ${currentView === 'app' ? styles.active : ''}`}
            >
              Workspace
            </button>
          )}
        </nav>
      </div>

      <div className={styles.topBarRight}>
        <nav className={styles.globalNavigation}>
          <button
            onClick={() => onSelectPage?.('About')}
            className={styles.globalNavItem}
            title="About NodeBook"
          >
            About
          </button>
          <button
            onClick={() => onSelectPage?.('Help')}
            className={styles.globalNavItem}
            title="Help & Documentation"
          >
            Help
          </button>
        </nav>
        
        {isAuthenticated && user ? (
          <div className={styles.userSection}>
            <div className={styles.userInfo}>
              <span className={styles.userIcon}>👤</span>
              <span className={styles.username}>{user.username}</span>
              {user.isAdmin && <span className={styles.adminBadge}>Admin</span>}
            </div>
            <button
              onClick={onLogout}
              className={styles.logoutButton}
              title="Logout"
            >
              Logout
            </button>
          </div>
        ) : (
          <button
            onClick={onShowAuth}
            className={styles.loginButton}
          >
            Sign In
          </button>
        )}
      </div>
    </div>
  );
};
