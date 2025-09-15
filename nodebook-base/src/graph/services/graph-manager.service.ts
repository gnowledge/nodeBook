import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import GraphManager from '../../../graph-manager.js';

@Injectable()
export class GraphManagerService {
  private graphManager: any;

  constructor(private configService: ConfigService) {
    this.initializeGraphManager();
  }

  private async initializeGraphManager() {
    try {
      // Direct ES module import
      this.graphManager = new GraphManager();
      await this.initialize();
    } catch (error) {
      console.error('Failed to initialize graph manager:', error);
      throw error; // Don't fallback to mock, let the error propagate
    }
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

