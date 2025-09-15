import { Module } from '@nestjs/common';
import { ScientificController } from './scientific.controller.js';
import { ScientificService } from './scientific.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [ScientificController],
  providers: [ScientificService],
})
export class ScientificModule {}

