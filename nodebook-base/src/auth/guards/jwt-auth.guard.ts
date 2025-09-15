import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service.js';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    // Skip authentication in development mode
    if (this.configService.get<string>('DISABLE_AUTH') === 'true') {
      const request = context.switchToHttp().getRequest();
      request.user = {
        id: 'dev-user-id',
        username: 'dev-user',
        email: 'dev@example.com',
        isAdmin: true,
      };
      return true;
    }

    // For production, validate Keycloak token directly
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      const user = await this.authService.verifyToken(token);
      if (!user) {
        throw new UnauthorizedException('Invalid token');
      }
      
      request.user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}

