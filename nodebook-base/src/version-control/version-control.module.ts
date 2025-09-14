import { Module } from '@nestjs/common';
import { VersionControlController } from './version-control.controller';
import { VersionControlService } from './version-control.service';

@Module({
  controllers: [VersionControlController],
  providers: [VersionControlService],
})
export class VersionControlModule {}
