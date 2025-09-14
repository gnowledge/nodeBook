import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Import the existing graph-manager.js module
const GraphManager = require('../../../../graph-manager.js');

@Injectable()
export class GraphManagerService {
  private graphManager: any;

  constructor(private configService: ConfigService) {
    this.graphManager = new GraphManager();
    this.initialize();
  }

  private async initialize() {
    const dataPath = this.configService.get<string>('DATA_PATH', './user_data');
    await this.graphManager.initialize(dataPath);
  }

  async getNodeRegistry(userId: string) {
    return this.graphManager.getNodeRegistry(userId);
  }

  async getPublicGraphs() {
    return this.graphManager.getPublicGraphs();
  }

  async getPublicGraph(graphId: string) {
    return this.graphManager.getPublicGraph(graphId);
  }

  async updatePublicationState(userId: string, graphId: string, publicationState: string) {
    return this.graphManager.updatePublicationState(userId, graphId, publicationState);
  }

  async publishGraph(userId: string, graphId: string) {
    return this.graphManager.publishGraph(userId, graphId);
  }
}
