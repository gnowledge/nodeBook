import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private configService: ConfigService) {
    super();
  }

  canActivate(context: ExecutionContext) {
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

    return super.canActivate(context);
  }
}

