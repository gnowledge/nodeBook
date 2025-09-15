import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeycloakStrategy {
  constructor(private configService: ConfigService) {}

  async validateToken(token: string) {
    // In development with auth disabled, return a mock admin user
    if (this.configService.get('DISABLE_AUTH') === 'true') {
      return {
        id: 'dev-user-id',
        username: 'dev-user',
        email: 'dev@example.com',
        isAdmin: true
      };
    }

    // In production, validate the token with Keycloak
    // This would typically involve making a request to Keycloak's userinfo endpoint
    try {
      const keycloakUrl = this.configService.get('KEYCLOAK_URL');
      const realm = this.configService.get('KEYCLOAK_REALM');
      
      const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/userinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid token');
      }

      const userInfo = await response.json();
      return {
        id: userInfo.sub,
        username: userInfo.preferred_username,
        email: userInfo.email,
        isAdmin: userInfo.realm_access?.roles?.includes('admin') || false
      };
    } catch (error) {
      throw new Error('Token validation failed');
    }
  }
}