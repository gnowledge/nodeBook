import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      message: 'NodeBook Backend is running',
      timestamp: new Date().toISOString(),
    };
  }
}
