import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GraphController } from './graph.controller.js';
import { GraphService } from './graph.service.js';
import { DataStoreService } from './services/data-store.service.js';
import { GraphManagerService } from './services/graph-manager.service.js';
import { CNLParserService } from './services/cnl-parser.service.js';
import { CNLSuggestionService } from './services/cnl-suggestion.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [ConfigModule, AuthModule],
  controllers: [GraphController],
  providers: [
    GraphService,
    DataStoreService,
    GraphManagerService,
    CNLParserService,
    CNLSuggestionService,
  ],
  exports: [GraphService, DataStoreService],
})
export class GraphModule {}

