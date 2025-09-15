import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller.js';
import { VersionControlService } from './version-control.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [VersionControlController],
  providers: [VersionControlService],
})
export class VersionControlModule {}

