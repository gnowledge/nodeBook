// src/services/keycloakAuth.ts
// Keycloak authentication service for NodeBook

export interface User {
  id: string;
  username: string;
  email?: string;
  isAdmin?: boolean;
}

export interface AuthResult {
  token: string;
  user: User;
}

class KeycloakAuthService {
  private keycloakUrl: string;
  private realm: string;
  private clientId: string;
  private clientSecret: string;
  private pkceVerifierStorageKey: string;

  constructor() {
    this.keycloakUrl = import.meta.env.VITE_KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = import.meta.env.VITE_KEYCLOAK_REALM || 'nodebook';
    this.clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'nodebook-frontend';
    this.clientSecret = import.meta.env.VITE_KEYCLOAK_CLIENT_SECRET || 'nodebook-frontend-secret';
    this.pkceVerifierStorageKey = 'keycloak_pkce_code_verifier';
  }

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<AuthResult> {
    try {
      const response = await fetch(`${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'password',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          username: username,
          password: password,
          scope: 'openid profile email'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error_description || errorData.error || 'Login failed');
      }

      const tokenData = await response.json();
      
      // Get user info from the token
      const userInfo = await this.getUserInfo(tokenData.access_token);
      
      return {
        token: tokenData.access_token,
        user: userInfo
      };
    } catch (error) {
      console.error('Keycloak login error:', error);
      throw error;
    }
  }

  /**
   * Register a new user (redirects to Keycloak registration page)
   */
  async register(): Promise<void> {
    const { verifier, challenge } = await this.createPkcePair();
    sessionStorage.setItem(this.pkceVerifierStorageKey, verifier);
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: window.location.origin,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    const registrationUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/registrations?${params.toString()}`;
    window.location.href = registrationUrl;
  }

  /**
   * Login using Keycloak's login page (redirects to Keycloak)
   */
  async loginWithKeycloak(): Promise<void> {
    const { verifier, challenge } = await this.createPkcePair();
    sessionStorage.setItem(this.pkceVerifierStorageKey, verifier);
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'openid profile email',
      redirect_uri: window.location.origin,
      code_challenge: challenge,
      code_challenge_method: 'S256'
    });
    const loginUrl = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/auth?${params.toString()}`;
    window.location.href = loginUrl;
  }

  /**
   * Forgot password (redirects to Keycloak)
   */
  async forgotPassword(): Promise<void> {
    const forgotPasswordUrl = `${this.keycloakUrl}/realms/${this.realm}/login-actions/reset-credentials?client_id=${this.clientId}&redirect_uri=${encodeURIComponent(window.location.origin)}`;
    window.location.href = forgotPasswordUrl;
  }

  /**
   * Handle OAuth callback and extract token
   */
  async handleCallback(): Promise<AuthResult | null> {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      return null;
    }

    if (!code) {
      return null;
    }

    try {
      const storedVerifier = sessionStorage.getItem(this.pkceVerifierStorageKey) || '';
      // Exchange code for token via backend to avoid CORS and unify logic
      const response = await fetch('/api/auth/callback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          redirect_uri: window.location.origin,
          code_verifier: storedVerifier || undefined
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error('Callback HTTP error:', response.status, text);
        throw new Error('Failed to exchange code for token');
      }

      const result = await response.json();

      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      if (storedVerifier) {
        sessionStorage.removeItem(this.pkceVerifierStorageKey);
      }

      return {
        token: result.token,
        user: result.user
      };
    } catch (error) {
      console.error('OAuth callback error:', error);
      return null;
    }
  }

  /**
   * Generate a PKCE pair (verifier, challenge)
   */
  private async createPkcePair(): Promise<{ verifier: string; challenge: string }> {
    const verifier = this.generateCodeVerifier();
    const challenge = await this.generateCodeChallenge(verifier);
    return { verifier, challenge };
  }

  /**
   * Generate a high-entropy URL-safe code verifier
   */
  private generateCodeVerifier(length: number = 64): string {
    const validChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    let result = '';
    for (let i = 0; i < array.length; i++) {
      result += validChars.charAt(array[i] % validChars.length);
    }
    return result;
  }

  /**
   * Generate a code challenge from a verifier using SHA-256 and base64url encoding
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(digest));
    const base64 = btoa(String.fromCharCode.apply(null, hashArray as unknown as number[]));
    // base64url
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Get user information from token
   */
  async getUserInfo(token: string): Promise<User> {
    try {
      const response = await fetch(`${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/userinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get user info');
      }

      const userInfo = await response.json();
      
      return {
        id: userInfo.sub,
        username: userInfo.preferred_username || userInfo.email,
        email: userInfo.email,
        isAdmin: userInfo.realm_access?.roles?.includes('admin') || false
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      throw error;
    }
  }

  /**
   * Validate token with NodeBook backend
   */
  async validateToken(token: string): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        return null;
      }

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Token validation error:', error);
      return null;
    }
  }

  /**
   * Logout (clear local storage)
   */
  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Optionally redirect to Keycloak logout
    // window.location.href = `${this.keycloakUrl}/realms/${this.realm}/protocol/openid-connect/logout?client_id=${this.clientId}&post_logout_redirect_uri=${encodeURIComponent(window.location.origin)}`;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  /**
   * Get stored user
   */
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Store authentication data
   */
  storeAuth(token: string, user: User): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }
}

// Export singleton instance
export const keycloakAuth = new KeycloakAuthService();
