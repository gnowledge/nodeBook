import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller.js';
import { VersionControlService } from './version-control.service.js';

@Module({
  controllers: [VersionControlController],
  providers: [VersionControlService],
})
export class VersionControlModule {}

