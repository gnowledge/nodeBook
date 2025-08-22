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
}

export const TopBar: React.FC<TopBarProps> = ({
  isAuthenticated,
  user,
  onGoToDashboard,
  onGoToApp,
  onShowAuth,
  onLogout,
  currentView
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
          <button
            onClick={() => window.open('/api/public/graphs', '_blank')}
            className={styles.navItem}
            title="View Public Graphs"
          >
            Public Graphs
          </button>
        </nav>
      </div>

      <div className={styles.topBarRight}>
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
