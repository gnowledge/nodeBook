import { Injectable } from '@nestjs/common';

// Import the existing cnl-suggestion-service.js module
const CNLSuggestionService = require('../../../../cnl-suggestion-service.js');

@Injectable()
export class CNLSuggestionService {
  private cnlSuggestionService: any;

  constructor() {
    this.cnlSuggestionService = new CNLSuggestionService();
  }

  async generateSuggestions(text: string) {
    return this.cnlSuggestionService.generateSuggestions(text);
  }

  async analyzeWithNLP(cnlText: string) {
    return this.cnlSuggestionService.analyzeWithNLP(cnlText);
  }

  assessQuality(operations: any[], nlpAnalysis: any) {
    return this.cnlSuggestionService.assessQuality(operations, nlpAnalysis);
  }

  generateRecommendations(operations: any[], qualityScore: any) {
    return this.cnlSuggestionService.generateRecommendations(operations, qualityScore);
  }
}
