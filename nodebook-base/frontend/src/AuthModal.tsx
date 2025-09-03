import React, { useState } from 'react';
import styles from './AuthModal.module.css';
import { keycloakAuth } from './services/keycloakAuth';

interface User {
  id: string;
  username: string;
  isAdmin?: boolean;
  email?: string;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (token: string, user: User) => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLogin }) => {
  const [error, setError] = useState('');

  const handleLogin = async () => {
    try {
      await keycloakAuth.loginWithKeycloak();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Network error. Please try again.');
      }
    }
  };

  const handleRegister = async () => {
    try {
      await keycloakAuth.register();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Network error. Please try again.');
      }
    }
  };

  const handleForgotPassword = async () => {
    try {
      await keycloakAuth.forgotPassword();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Network error. Please try again.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.authModalOverlay} onClick={onClose}>
      <div className={styles.authModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.authModalHeader}>
          <h2>Authentication</h2>
          <button className={styles.authModalClose} onClick={onClose}>
            ×
          </button>
        </div>

        <div className={styles.authForm}>
          <p style={{ textAlign: 'center', marginBottom: '1.5rem', color: '#666' }}>
            Please choose an option to continue:
          </p>

          {error && (
            <div className={styles.authError}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <button 
              onClick={handleLogin}
              className={styles.authSubmitBtn}
              style={{ background: '#007bff' }}
            >
              🔐 Login to Existing Account
            </button>

            <button 
              onClick={handleRegister}
              className={styles.authSubmitBtn}
              style={{ background: '#28a745' }}
            >
              ✨ Create New Account
            </button>

            <button 
              onClick={handleForgotPassword}
              className={styles.authToggleBtn}
            >
              🔑 Forgot Password?
            </button>
          </div>
        </div>

        <div className={styles.authModalFooter}>
          <p style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
            All authentication is handled securely by Keycloak
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
