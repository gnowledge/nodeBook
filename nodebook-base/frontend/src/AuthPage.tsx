// src/AuthPage.tsx
import React, { useEffect, useState } from 'react';
import { keycloakAuth } from './services/keycloakAuth';
import type { User } from './api';

interface AuthPageProps {
  onAuthSuccess: (token: string, user: User) => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess }) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if this is an OAuth callback
    const handleOAuthCallback = async () => {
      const result = await keycloakAuth.handleCallback();
      if (result) {
        keycloakAuth.storeAuth(result.token, result.user);
        onAuthSuccess(result.token, result.user);
      }
    };

    handleOAuthCallback();
  }, [onAuthSuccess]);

  const handleLogin = async () => {
    try {
      await keycloakAuth.loginWithKeycloak();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
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
        setError('An unknown error occurred.');
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
        setError('An unknown error occurred.');
      }
    }
  };

  return (
    <div style={{ maxWidth: '500px', margin: '100px auto', padding: '2rem', border: '1px solid #ccc', borderRadius: '8px', textAlign: 'center' }}>
      <h2>Welcome to NodeBook</h2>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Please choose an option to continue:
      </p>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#ffe6e6', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <button 
          onClick={handleLogin}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          🔐 Login to Existing Account
        </button>

        <button 
          onClick={handleRegister}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ✨ Create New Account
        </button>

        <button 
          onClick={handleForgotPassword}
          style={{ 
            width: '100%', 
            padding: '12px', 
            background: 'transparent', 
            color: '#007bff', 
            border: '1px solid #007bff', 
            borderRadius: '4px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          🔑 Forgot Password?
        </button>
      </div>

      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '14px', color: '#666' }}>
        <p><strong>All authentication is handled securely by Keycloak</strong></p>
        <p>This includes:</p>
        <ul style={{ textAlign: 'left', margin: '0.5rem 0' }}>
          <li>Secure login and registration</li>
          <li>Password reset via email</li>
          <li>Email verification</li>
          <li>Two-factor authentication (when enabled)</li>
          <li>Social login (when configured)</li>
        </ul>
      </div>
    </div>
  );
};

export default AuthPage;
