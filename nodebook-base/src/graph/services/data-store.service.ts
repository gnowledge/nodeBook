import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createDataStore } from '../../../data-store.js';

@Injectable()
export class DataStoreService {
  private dataStore: any;
  private initializationPromise: Promise<void>;

  constructor(private configService: ConfigService) {
    this.initializationPromise = this.initializeDataStore();
  }

  private async initializeDataStore() {
    try {
      // Direct ES module import
      const dataPath = this.configService.get<string>('DATA_PATH', './user_data');
      this.dataStore = createDataStore('file-system', { dataPath });
      await this.initialize();
    } catch (error) {
      console.error('Failed to initialize data store:', error);
      throw error; // Don't fallback to mock, let the error propagate
    }
  }


  private async initialize() {
    await this.dataStore.initialize();
    console.log(`✅ DataStore initialized with path: ${this.configService.get<string>('DATA_PATH', './user_data')}`);
  }

  private async ensureInitialized() {
    await this.initializationPromise;
    if (!this.dataStore) {
      throw new Error('DataStore failed to initialize');
    }
  }

  // Graph Registry methods
  async getGraphRegistry(userId: string) {
    await this.ensureInitialized();
    return this.dataStore.getGraphRegistry(userId);
  }

  async updateGraphRegistry(userId: string, graphId: string, updates: any) {
    await this.ensureInitialized();
    return this.dataStore.updateGraphRegistry(userId, graphId, updates);
  }

  // Graph methods
  async createGraphObject(userId: string, graphId: string) {
    await this.ensureInitialized();
    return this.dataStore.createGraphObject(userId, graphId);
  }

  async getGraph(userId: string, graphId: string) {
    await this.ensureInitialized();
    return this.dataStore.getGraph(userId, graphId);
  }

  async saveGraph(userId: string, graphId: string, graphData: any) {
    await this.ensureInitialized();
    return this.dataStore.saveGraph(userId, graphId, graphData);
  }

  async deleteGraph(userId: string, graphId: string) {
    await this.ensureInitialized();
    return this.dataStore.deleteGraph(userId, graphId);
  }

  // CNL methods
  async getCnl(userId: string, graphId: string) {
    await this.ensureInitialized();
    return this.dataStore.getCnl(userId, graphId);
  }

  async saveCnl(userId: string, graphId: string, cnlText: string) {
    await this.ensureInitialized();
    return this.dataStore.saveCnl(userId, graphId, cnlText);
  }

  async regenerateGraphFromCnl(userId: string, graphId: string, cnlText: string) {
    await this.ensureInitialized();
    return this.dataStore.regenerateGraphFromCnl(userId, graphId, cnlText);
  }

  // Manifest methods
  async createManifest(userId: string, graphId: string, manifestData: any, userInfo: any) {
    await this.ensureInitialized();
    return this.dataStore.createManifest(userId, graphId, manifestData, userInfo);
  }

  async getManifest(userId: string, graphId: string) {
    await this.ensureInitialized();
    return this.dataStore.getManifest(userId, graphId);
  }

  async updateManifest(userId: string, graphId: string, userInfo: any) {
    await this.ensureInitialized();
    return this.dataStore.updateManifest(userId, graphId, userInfo);
  }

  // Version control methods
  async initializeVersionControl(userId: string, graphId: string, userName: string, userEmail: string) {
    await this.ensureInitialized();
    return this.dataStore.initializeVersionControl(userId, graphId, userName, userEmail);
  }

  // Morph registry methods
  getFilteredRelations(relations: any[], activeMorphs: string[]) {
    return this.dataStore.getFilteredRelations(relations, activeMorphs);
  }

  getFilteredAttributes(attributes: any[], activeMorphs: string[]) {
    return this.dataStore.getFilteredAttributes(attributes, activeMorphs);
  }

  // Directory methods
  getGraphDataDir(userId: string, graphId: string) {
    return this.dataStore.getGraphDataDir(userId, graphId);
  }
}