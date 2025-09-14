import { Module } from '@nestjs/common';
import { GraphController } from './graph.controller';
import { GraphService } from './graph.service';
import { DataStoreService } from './services/data-store.service';
import { GraphManagerService } from './services/graph-manager.service';
import { CNLParserService } from './services/cnl-parser.service';
import { CNLSuggestionService } from './services/cnl-suggestion.service';

@Module({
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
