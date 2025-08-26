/**
 * NLP Analysis Service
 * Handles communication with the NLP microservice for text analysis
 */

export interface NLPAnalysis {
  language: string;
  originalText: string;
  wordCount: number;
  sentenceCount: number;
  nouns: string[];
  verbs: string[];
  adjectives: string[];
  adverbs: string[];
  people: string[];
  places: string[];
  organizations: string[];
  numbers: string[];
  dates: string[];
  relations: Array<{
    from: string;
    to: string;
    verb: string;
    confidence: number;
    sentence: string;
    type: string;
  }>;
  attributes: Array<{
    entity: string;
    key: string;
    value: string;
    confidence: number;
    pattern: string;
  }>;
  processes: Array<{
    label: string;
    confidence: number;
    keyword: string;
    type: string;
  }>;
  states: Array<{
    label: string;
    prior: string;
    post: string;
    confidence: number;
    type: string;
  }>;
  functions: Array<{
    label: string;
    expression: string;
    confidence: number;
    keyword: string;
    type: string;
  }>;
  nounCategories: {
    properNouns: Array<{ text: string; type: string; confidence: number }>;
    commonNouns: Array<{ text: string; type: string; confidence: number }>;
    concepts: Array<{ text: string; type: string; confidence: number }>;
    measurements: Array<{ text: string; type: string; confidence: number }>;
  };
  logicalConnectives: Array<{
    word: string;
    type: string;
    function: string;
    confidence: number;
  }>;
  prepositions: Array<{ word: string; type: string; function: string; confidence: number }>;
  conjunctions: Array<{ word: string; type: string; function: string; confidence: number }>;
  articles: Array<{ word: string; type: string; function: string; confidence: number }>;
  textType: string;
  complexity: string;
  graphBuildingPotential: string;
}

export interface NLPAnalysisResult {
  success: boolean;
  analysis: NLPAnalysis;
  suggestions: string[];
  cost: {
    local: string;
    ai: string;
    total: string;
  };
}

export interface NLPAnalysisError {
  error: string;
  message: string;
  status?: number;
}

/**
 * Analyzes a single text description using the NLP service
 */
export async function analyzeText(text: string): Promise<NLPAnalysisResult | NLPAnalysisError> {
  try {
    const nlpServiceUrl = import.meta.env.VITE_NLP_SERVICE_URL || 'http://localhost:3002';
    
    const response = await fetch(`${nlpServiceUrl}/api/nlp/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: text.trim(),
        language: 'en'
      }),
    });
    
    if (!response.ok) {
      return {
        error: 'HTTP_ERROR',
        message: `HTTP ${response.status}: ${response.statusText}`,
        status: response.status
      };
    }
    
    const result = await response.json();
    return result;
    
  } catch (error) {
    return {
      error: 'NETWORK_ERROR',
      message: error instanceof Error ? error.message : 'Unknown network error'
    };
  }
}

/**
 * Analyzes multiple text descriptions and returns combined results
 */
export async function analyzeMultipleTexts(texts: string[]): Promise<{
  results: Array<NLPAnalysisResult | NLPAnalysisError>;
  summary: {
    total: number;
    successful: number;
    failed: number;
    totalWords: number;
    totalSentences: number;
  };
}> {
  const results: Array<NLPAnalysisResult | NLPAnalysisError> = [];
  let totalWords = 0;
  let totalSentences = 0;
  
  // Analyze each text
  for (const text of texts) {
    if (text.trim()) {
      const result = await analyzeText(text);
      results.push(result);
      
      // If successful, add to totals
      if ('analysis' in result) {
        totalWords += result.analysis.wordCount;
        totalSentences += result.analysis.sentenceCount;
      }
    }
  }
  
  const successful = results.filter(r => 'analysis' in r).length;
  const failed = results.filter(r => 'error' in r).length;
  
  return {
    results,
    summary: {
      total: texts.length,
      successful,
      failed,
      totalWords,
      totalSentences
    }
  };
}

/**
 * Gets the health status of the NLP service
 */
export async function getNLPHealth(): Promise<{ status: string; service: string; version: string } | null> {
  try {
    const nlpServiceUrl = import.meta.env.VITE_NLP_SERVICE_URL || 'http://localhost:3002';
    
    const response = await fetch(`${nlpServiceUrl}/health`);
    
    if (response.ok) {
      const health = await response.json();
      return health;
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Checks if the NLP service is available
 */
export async function isNLPServiceAvailable(): Promise<boolean> {
  const health = await getNLPHealth();
  return health !== null && health.status === 'ok';
}
