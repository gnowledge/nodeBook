import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  private readonly KEYCLOAK_URL = this.configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
  private readonly KEYCLOAK_REALM = this.configService.get<string>('KEYCLOAK_REALM', 'nodebook');
  private readonly KEYCLOAK_CLIENT_ID = this.configService.get<string>('KEYCLOAK_CLIENT_ID', 'nodebook-frontend');
  private readonly KEYCLOAK_CLIENT_SECRET = this.configService.get<string>('KEYCLOAK_CLIENT_SECRET', 'nodebook-frontend-secret');
  private readonly DISABLE_AUTH = this.configService.get<string>('DISABLE_AUTH', 'false') === 'true';

  async login(loginDto: any) {
    if (this.DISABLE_AUTH) {
      return {
        access_token: 'dev-token',
        user: {
          id: 'dev-user-id',
          username: 'dev-user',
          email: 'dev@example.com',
          isAdmin: true,
        },
      };
    }

    try {
      const response = await fetch(`${this.KEYCLOAK_URL}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginDto.username,
          password: loginDto.password,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new UnauthorizedException(errorData.error || 'Login failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Login failed');
    }
  }

  async register(registerDto: any) {
    if (this.DISABLE_AUTH) {
      return {
        id: 'dev-user-id',
        username: registerDto.username,
        email: registerDto.email,
        message: 'Registration successful (dev mode)',
      };
    }

    try {
      const response = await fetch(`${this.KEYCLOAK_URL}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registerDto),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new BadRequestException(errorData.error || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Registration failed');
    }
  }

  async callback(callbackDto: any) {
    if (this.DISABLE_AUTH) {
      return {
        token: 'dev-token',
        user: {
          id: 'dev-user-id',
          username: 'dev-user',
          email: 'dev@example.com',
          isAdmin: true,
        },
      };
    }

    try {
      const finalRedirect = callbackDto.redirect_uri || 
        (this.configService.get<string>('DOMAIN_NAME') ? 
          `https://${this.configService.get<string>('DOMAIN_NAME')}` : 
          'http://localhost:5173');

      const tokenResponse = await fetch(`${this.KEYCLOAK_URL}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.KEYCLOAK_CLIENT_ID,
          client_secret: this.KEYCLOAK_CLIENT_SECRET,
          code: callbackDto.code,
          redirect_uri: finalRedirect,
        }),
      });

      if (!tokenResponse.ok) {
        throw new BadRequestException('Token exchange failed');
      }

      const tokenData = await tokenResponse.json();

      // Get user info
      const userInfoRes = await fetch(`${this.KEYCLOAK_URL}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userInfoRes.ok) {
        throw new BadRequestException('Failed to fetch user info');
      }

      const userInfo = await userInfoRes.json();

      return {
        token: tokenData.access_token,
        user: {
          id: userInfo.sub,
          username: userInfo.preferred_username || userInfo.email,
          email: userInfo.email,
          isAdmin: userInfo.realm_access?.roles?.includes('admin') || false,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('OAuth callback error');
    }
  }

  async getMe(user: any) {
    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      email: user.email,
      emailVerified: user.emailVerified,
    };
  }

  async forgotPassword(forgotPasswordDto: any) {
    if (this.configService.get<string>('EMAIL_FEATURES_ENABLED') !== 'true') {
      throw new BadRequestException('Password reset is not enabled');
    }

    // In a real implementation, this would send an email
    return { success: true, message: 'Password reset email sent' };
  }

  async resetPassword(resetPasswordDto: any) {
    if (this.configService.get<string>('EMAIL_FEATURES_ENABLED') !== 'true') {
      throw new BadRequestException('Password reset is not enabled');
    }

    // In a real implementation, this would validate the token and reset the password
    return { success: true, message: 'Password reset successful' };
  }

  async verifyEmail(verifyEmailDto: any) {
    if (this.configService.get<string>('EMAIL_FEATURES_ENABLED') !== 'true') {
      throw new BadRequestException('Email verification is not enabled');
    }

    // In a real implementation, this would verify the email token
    return { success: true, message: 'Email verified successfully' };
  }

  async resendVerification(resendVerificationDto: any) {
    if (this.configService.get<string>('EMAIL_FEATURES_ENABLED') !== 'true') {
      throw new BadRequestException('Email verification is not enabled');
    }

    // In a real implementation, this would resend the verification email
    return { success: true, message: 'Verification email sent' };
  }

  async verifyToken(token: string) {
    if (this.DISABLE_AUTH) {
      return {
        id: 'dev-user-id',
        username: 'dev-user',
        email: 'dev@example.com',
        isAdmin: true,
      };
    }

    try {
      const response = await fetch(`${this.KEYCLOAK_URL}/realms/${this.KEYCLOAK_REALM}/protocol/openid-connect/userinfo`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        return null;
      }

      const userInfo = await response.json();

      return {
        id: userInfo.sub,
        username: userInfo.preferred_username || userInfo.email,
        email: userInfo.email,
        isAdmin: userInfo.realm_access?.roles?.includes('admin') || false,
      };
    } catch (error) {
      return null;
    }
  }
}
