import { Module } from '@nestjs/common';
import { ScientificController } from './scientific.controller.js';
import { ScientificService } from './scientific.service.js';

@Module({
  controllers: [ScientificController],
  providers: [ScientificService],
})
export class ScientificModule {}

