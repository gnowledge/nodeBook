export interface WordNetDefinition {
  id: number;
  text: string;
  type: string;
  confidence: number;
}

export interface WordNetResult {
  term: string;
  definitions: WordNetDefinition[];
  relatedTerms: string[];
  wordNetInfo: {
    synsets: number;
    hypernyms: number;
    hyponyms: number;
  };
}

export interface WordNetResponse {
  success: boolean;
  data: WordNetResult[];
  metadata: {
    term: string;
    totalResults: number;
    timestamp: string;
  };
}

export interface BatchWordNetRequest {
  terms: string[];
  maxResults?: number;
}

export interface RelatedTermsResponse {
  success: boolean;
  data: {
    term: string;
    hypernyms: string[];
    hyponyms: string[];
    synonyms: string[];
    antonyms: string[];
    meronyms: string[];
    holonyms: string[];
  };
  metadata: {
    term: string;
    relationType: string;
    timestamp: string;
  };
}

const WORDNET_SERVICE_URL = import.meta.env.VITE_WORDNET_SERVICE_URL || 'http://localhost:3003';

export class WordNetService {
  private static async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    try {
      const response = await fetch(`${WORDNET_SERVICE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('WordNet service request failed:', error);
      throw error;
    }
  }

  /**
   * Get definitions for a single term
   */
  static async getDefinitions(term: string, maxResults: number = 3): Promise<WordNetResponse> {
    return this.makeRequest<WordNetResponse>(
      `/api/wordnet/definitions/${encodeURIComponent(term)}?maxResults=${maxResults}`
    );
  }

  /**
   * Get definitions for multiple terms in batch
   */
  static async getBatchDefinitions(request: BatchWordNetRequest): Promise<WordNetResponse> {
    return this.makeRequest<WordNetResponse>('/api/wordnet/definitions/batch', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  /**
   * Get related terms for a given term
   */
  static async getRelatedTerms(term: string, relationType: string = 'all'): Promise<RelatedTermsResponse> {
    return this.makeRequest<RelatedTermsResponse>(
      `/api/wordnet/related/${encodeURIComponent(term)}?relationType=${relationType}`
    );
  }

  /**
   * Check if the WordNet service is available
   */
  static async isServiceAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${WORDNET_SERVICE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('WordNet service health check failed:', error);
      return false;
    }
  }

  /**
   * Get service health information
   */
  static async getServiceHealth(): Promise<any> {
    return this.makeRequest<any>('/health');
  }

  /**
   * Extract terms from CNL text that might need descriptions
   */
  static extractTermsFromCNL(cnlText: string): string[] {
    const lines = cnlText.split('\n');
    const terms: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this is a node definition (markdown heading)
      if (trimmedLine.startsWith('#')) {
        // Extract the node name (remove # and optional type)
        const nodeMatch = trimmedLine.match(/^#\s*(.+?)(?:\s*\[.*?\])?\s*$/);
        if (nodeMatch) {
          const nodeName = nodeMatch[1].trim();
          if (nodeName && !this.hasDescriptionBlock(cnlText, trimmedLine)) {
            terms.push(nodeName);
          }
        }
      }
    }
    
    return terms;
  }

  /**
   * Check if a node line has a description block
   */
  private static hasDescriptionBlock(cnlText: string, nodeLine: string): boolean {
    const lines = cnlText.split('\n');
    const nodeIndex = lines.findIndex(line => line.trim() === nodeLine.trim());
    
    if (nodeIndex === -1) return false;
    
    // Look for description block after the node line
    for (let i = nodeIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // If we hit another node, stop looking
      if (line.startsWith('#')) break;
      
      // If we find a description block, return true
      if (line === '```description') {
        // Check if there's content in the description block
        for (let j = i + 1; j < lines.length; j++) {
          const descLine = lines[j].trim();
          if (descLine === '```') break; // End of description block
          if (descLine && descLine !== '```description') return true; // Has content
        }
      }
    }
    
    return false;
  }

  /**
   * Insert description into CNL text for a specific node
   */
  static insertDescription(cnlText: string, nodeName: string, description: string): string {
    const lines = cnlText.split('\n');
    const updatedLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      updatedLines.push(lines[i]); // Keep original line
      
      // If this is the target node
      if (line.startsWith('#') && line.includes(nodeName)) {
        // Check if it already has a description block
        let hasDescription = false;
        for (let j = i + 1; j < lines.length; j++) {
          const nextLine = lines[j].trim();
          if (nextLine.startsWith('#')) break; // Another node
          if (nextLine === '```description') {
            hasDescription = true;
            break;
          }
        }
        
        // If no description block, add one
        if (!hasDescription) {
          updatedLines.push('```description');
          updatedLines.push(description);
          updatedLines.push('```');
        }
      }
    }
    
    return updatedLines.join('\n');
  }
}
