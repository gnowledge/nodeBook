import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'nodebook-secret'),
    });
  }

  async validate(payload: any) {
    // For development mode with DISABLE_AUTH
    if (this.configService.get<string>('DISABLE_AUTH') === 'true') {
      return {
        id: 'dev-user-id',
        username: 'dev-user',
        email: 'dev@example.com',
        isAdmin: true,
      };
    }

    // For production, this should not be called since we handle validation in the guard
    // But if it is called, return the payload as user
    return {
      id: payload.sub || payload.id,
      username: payload.preferred_username || payload.username,
      email: payload.email,
      isAdmin: payload.realm_access?.roles?.includes('admin') || false,
    };
  }
}

