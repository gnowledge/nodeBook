import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class KeycloakStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(private configService: ConfigService) {
    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'nodebook');
    const clientId = configService.get<string>('KEYCLOAK_CLIENT_ID', 'nodebook-frontend');
    const clientSecret = configService.get<string>('KEYCLOAK_CLIENT_SECRET', 'nodebook-frontend-secret');

    super({
      authorizationURL: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/auth`,
      tokenURL: `${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`,
      clientID: clientId,
      clientSecret: clientSecret,
      callbackURL: '/api/auth/callback',
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: any) {
    // This would be called after successful OAuth flow
    // In a real implementation, you'd fetch user info from Keycloak
    return {
      id: profile.id,
      username: profile.username,
      email: profile.email,
      isAdmin: profile.roles?.includes('admin') || false,
    };
  }
}
