import { Module } from '@nestjs/common';
import { ScientificController } from './scientific.controller';
import { ScientificService } from './scientific.service';

@Module({
  controllers: [ScientificController],
  providers: [ScientificService],
})
export class ScientificModule {}
