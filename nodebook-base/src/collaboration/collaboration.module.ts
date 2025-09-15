import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller.js';
import { CollaborationService } from './collaboration.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [CollaborationController],
  providers: [CollaborationService],
})
export class CollaborationModule {}

