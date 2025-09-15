import { Injectable } from '@nestjs/common';
import CNLSuggestionServiceJS from '../../../cnl-suggestion-service.js';

@Injectable()
export class CNLSuggestionService {
  private service: any;

  constructor() {
    this.service = new CNLSuggestionServiceJS();
  }

  async generateSuggestions(text: string) {
    return this.service.generateSuggestions(text);
  }

  async analyzeWithNLP(cnlText: string) {
    return this.service.analyzeWithNLP(cnlText);
  }

  async assessQuality(operations: any[], nlpAnalysis: any) {
    return this.service.assessQuality(operations, nlpAnalysis);
  }

  async generateRecommendations(operations: any[], qualityScore: any) {
    return this.service.generateRecommendations(operations, qualityScore);
  }
}
