import { Module } from '@nestjs/common';
import { CollaborationController } from './collaboration.controller.js';
import { CollaborationService } from './collaboration.service.js';

@Module({
  controllers: [CollaborationController],
  providers: [CollaborationService],
})
export class CollaborationModule {}

