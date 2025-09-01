import React, { useState } from 'react';
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleMobileMenuClick = (action: string) => {
    setIsMobileMenuOpen(false);
    
    switch (action) {
      case 'about':
        onSelectPage?.('About');
        break;
      case 'help':
        onSelectPage?.('Help');
        break;
      case 'logout':
        onLogout();
        break;
      case 'dashboard':
        onGoToDashboard();
        break;
      case 'app':
        onGoToApp();
        break;
      case 'auth':
        onShowAuth();
        break;
    }
  };

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

      {/* Workspace switch removed - App is single-graph only */}

      {/* Desktop Navigation */}
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

      {/* Mobile Menu Button */}
      <button
        onClick={toggleMobileMenu}
        className={styles.mobileMenuButton}
        title="Menu"
      >
        ☰
      </button>

      {/* Mobile Dropdown Menu */}
      {isMobileMenuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={toggleMobileMenu}>
          <div className={styles.mobileMenuDropdown} onClick={(e) => e.stopPropagation()}>
            <div className={styles.mobileMenuHeader}>
              <h3>Menu</h3>
              <button
                onClick={toggleMobileMenu}
                className={styles.mobileMenuCloseBtn}
                title="Close"
              >
                ×
              </button>
            </div>
            
            <div className={styles.mobileMenuContent}>
              {/* Navigation Items */}
              <div className={styles.mobileMenuSection}>
                <h4>Navigation</h4>
                <button
                  onClick={() => handleMobileMenuClick('dashboard')}
                  className={styles.mobileMenuItem}
                >
                  🏠 Dashboard
                </button>
                {isAuthenticated && (
                  <button
                    onClick={() => handleMobileMenuClick('app')}
                    className={styles.mobileMenuItem}
                  >
                    💼 Workspace
                  </button>
                )}
              </div>

              {/* Documentation */}
              <div className={styles.mobileMenuSection}>
                <h4>Documentation</h4>
                <button
                  onClick={() => handleMobileMenuClick('about')}
                  className={styles.mobileMenuItem}
                >
                  ℹ️ About
                </button>
                <button
                  onClick={() => handleMobileMenuClick('help')}
                  className={styles.mobileMenuItem}
                >
                  ❓ Help
                </button>
              </div>

              {/* User Section */}
              {isAuthenticated && user ? (
                <div className={styles.mobileMenuSection}>
                  <h4>Account</h4>
                  <div className={styles.mobileUserInfo}>
                    <span className={styles.mobileUserIcon}>👤</span>
                    <span className={styles.mobileUsername}>{user.username}</span>
                    {user.isAdmin && <span className={styles.mobileAdminBadge}>Admin</span>}
                  </div>
                  <button
                    onClick={() => handleMobileMenuClick('logout')}
                    className={styles.mobileMenuItem}
                  >
                    🚪 Logout
                  </button>
                </div>
              ) : (
                <div className={styles.mobileMenuSection}>
                  <h4>Account</h4>
                  <button
                    onClick={() => handleMobileMenuClick('auth')}
                    className={styles.mobileMenuItem}
                  >
                    🔑 Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
