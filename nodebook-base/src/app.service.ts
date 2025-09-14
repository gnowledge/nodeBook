import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo() {
    return {
      name: 'NodeBook API',
      version: '1.0.0',
      description: 'NodeBook Backend API with NestJS and Swagger',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}
