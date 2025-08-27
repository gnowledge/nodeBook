export interface GraphScore {
  totalScore: number;
  breakdown: {
    nodes: { count: number; score: number };
    relations: { count: number; score: number };
    attributes: { count: number; score: number };
    adjectives: { count: number; score: number };
    adverbs: { count: number; score: number };
    quantifiers: { count: number; score: number };
    modality: { count: number; score: number };
  };
  details: {
    nodeTitles: string[];
    relationTexts: string[];
    attributeTexts: string[];
    adjectivesFound: string[];
    adverbsFound: string[];
    quantifiersFound: string[];
    modalityFound: string[];
  };
}

export interface Node {
  id: string;
  name: string;
  role?: string;
  description?: string;
}

export interface Edge {
  id: string;
  name: string;
  source_id: string;
  target_id: string;
}

export interface AttributeType {
  id: string;
  name: string;
  value: string;
  unit?: string;
  source_id: string;
}

// Common adjectives that might appear in node titles
const COMMON_ADJECTIVES = [
  'big', 'small', 'large', 'tiny', 'huge', 'massive', 'enormous', 'gigantic',
  'fast', 'slow', 'quick', 'rapid', 'swift', 'sluggish', 'speedy',
  'hot', 'cold', 'warm', 'cool', 'freezing', 'boiling', 'tepid',
  'new', 'old', 'young', 'ancient', 'modern', 'contemporary', 'vintage',
  'good', 'bad', 'excellent', 'terrible', 'wonderful', 'awful', 'amazing',
  'strong', 'weak', 'powerful', 'feeble', 'robust', 'fragile', 'sturdy',
  'high', 'low', 'tall', 'short', 'elevated', 'depressed', 'raised',
  'wide', 'narrow', 'broad', 'thin', 'expansive', 'constricted', 'spacious',
  'deep', 'shallow', 'profound', 'superficial', 'intense', 'mild', 'extreme',
  'complex', 'simple', 'complicated', 'basic', 'advanced', 'elementary', 'sophisticated'
];

// Common adverbs that might appear in relations or attributes
const COMMON_ADVERBS = [
  'quickly', 'slowly', 'rapidly', 'gradually', 'suddenly', 'immediately',
  'carefully', 'carelessly', 'precisely', 'accurately', 'roughly', 'exactly',
  'strongly', 'weakly', 'powerfully', 'gently', 'forcefully', 'softly',
  'highly', 'lowly', 'deeply', 'shallowly', 'thoroughly', 'superficially',
  'clearly', 'vaguely', 'obviously', 'subtly', 'directly', 'indirectly',
  'easily', 'difficultly', 'simply', 'complexly', 'naturally', 'artificially',
  'actively', 'passively', 'dynamically', 'statically', 'continuously', 'intermittently',
  'positively', 'negatively', 'constructively', 'destructively', 'creatively', 'destructively'
];

// Quantifiers that indicate measurement or quantity
const QUANTIFIERS = [
  'all', 'some', 'many', 'few', 'several', 'numerous', 'countless',
  'most', 'least', 'majority', 'minority', 'half', 'quarter', 'third',
  'hundred', 'thousand', 'million', 'billion', 'trillion',
  'dozen', 'score', 'gross', 'ream', 'mole',
  'percent', 'percentage', 'ratio', 'proportion', 'fraction',
  'more', 'less', 'greater', 'smaller', 'higher', 'lower',
  'equal', 'equivalent', 'same', 'different', 'similar', 'dissimilar'
];

// Modality indicators (possibility, necessity, certainty)
const MODALITY_INDICATORS = [
  'can', 'could', 'may', 'might', 'will', 'would', 'shall', 'should',
  'must', 'ought', 'need', 'dare', 'used to',
  'possible', 'impossible', 'likely', 'unlikely', 'certain', 'uncertain',
  'definite', 'indefinite', 'probable', 'improbable', 'plausible', 'implausible',
  'necessary', 'unnecessary', 'required', 'optional', 'mandatory', 'voluntary',
  'always', 'never', 'sometimes', 'often', 'rarely', 'usually', 'occasionally',
  'definitely', 'probably', 'possibly', 'certainly', 'surely', 'undoubtedly'
];

export function calculateGraphScore(nodes: Node[], relations: Edge[], attributes: AttributeType[]): GraphScore {
  let totalScore = 0;
  
  // Basic counts
  const nodeCount = nodes.length;
  const relationCount = relations.length;
  const attributeCount = attributes.length;
  
  // Calculate basic scores
  const nodeScore = nodeCount * 1;
  const relationScore = relationCount * 2;
  const attributeScore = attributeCount * 3;
  
  totalScore += nodeScore + relationScore + attributeScore;
  
  // Extract text for analysis
  const nodeTitles = nodes.map(n => n.name.toLowerCase());
  const relationTexts = relations.map(r => r.name.toLowerCase());
  const attributeTexts = attributes.map(a => `${a.name} ${a.value}`.toLowerCase());
  
  // Find adjectives in node titles
  const adjectivesFound: string[] = [];
  nodeTitles.forEach(title => {
    const words = title.split(/\s+/);
    words.forEach(word => {
      if (COMMON_ADJECTIVES.includes(word)) {
        adjectivesFound.push(word);
      }
    });
  });
  
  // Find adverbs in relations and attributes
  const adverbsFound: string[] = [];
  [...relationTexts, ...attributeTexts].forEach(text => {
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (COMMON_ADVERBS.includes(word)) {
        adverbsFound.push(word);
      }
    });
  });
  
  // Find quantifiers
  const quantifiersFound: string[] = [];
  [...nodeTitles, ...relationTexts, ...attributeTexts].forEach(text => {
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (QUANTIFIERS.includes(word)) {
        quantifiersFound.push(word);
      }
    });
  });
  
  // Find modality indicators
  const modalityFound: string[] = [];
  [...nodeTitles, ...relationTexts, ...attributeTexts].forEach(text => {
    const words = text.split(/\s+/);
    words.forEach(word => {
      if (MODALITY_INDICATORS.includes(word)) {
        modalityFound.push(word);
      }
    });
  });
  
  // Calculate bonus scores
  const adjectiveScore = adjectivesFound.length * 1;
  const adverbScore = adverbsFound.length * 1;
  const quantifierScore = quantifiersFound.length * 4;
  const modalityScore = modalityFound.length * 4;
  
  totalScore += adjectiveScore + adverbScore + quantifierScore + modalityScore;
  
  return {
    totalScore,
    breakdown: {
      nodes: { count: nodeCount, score: nodeScore },
      relations: { count: relationCount, score: relationScore },
      attributes: { count: attributeCount, score: attributeScore },
      adjectives: { count: adjectivesFound.length, score: adjectiveScore },
      adverbs: { count: adverbsFound.length, score: adverbScore },
      quantifiers: { count: quantifiersFound.length, score: quantifierScore },
      modality: { count: modalityFound.length, score: modalityScore }
    },
    details: {
      nodeTitles,
      relationTexts,
      attributeTexts,
      adjectivesFound,
      adverbsFound,
      quantifiersFound,
      modalityFound
    }
  };
}

export function getScoreDescription(score: number): string {
  if (score < 10) return 'Beginner';
  if (score < 25) return 'Intermediate';
  if (score < 50) return 'Advanced';
  if (score < 100) return 'Expert';
  return 'Master';
}

export function getScoreColor(score: number): string {
  if (score < 10) return '#6b7280'; // gray
  if (score < 25) return '#3b82f6'; // blue
  if (score < 50) return '#10b981'; // green
  if (score < 100) return '#f59e0b'; // amber
  return '#ef4444'; // red
}
