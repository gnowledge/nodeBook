import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SchemaController } from './schema.controller.js';
import { SchemaService } from './schema.service.js';

@Module({
  imports: [ConfigModule],
  controllers: [SchemaController],
  providers: [SchemaService],
  exports: [SchemaService],
})
export class SchemaModule {}

