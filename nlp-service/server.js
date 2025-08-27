const fastify = require('fastify')({ logger: true })
const nlp = require('compromise')

// Register CORS plugin
fastify.register(require('@fastify/cors'), {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
})

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    service: 'nlp-service',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    capabilities: {
      localNLP: 'compromise (English)',
      aiModels: 'planned',
      multiLanguage: 'planned'
    }
  }
})

// Core text analysis endpoint
fastify.post('/api/nlp/analyze', async (request, reply) => {
  try {
    const { text, language = 'en' } = request.body
    
    if (!text) {
      reply.code(400).send({ error: 'Text is required' })
      return
    }

    // For now, we only support English with compromise
    if (language !== 'en') {
      reply.code(400).send({ 
        error: 'Only English is supported currently',
        supportedLanguages: ['en'],
        plannedLanguages: ['es', 'fr', 'de', 'zh', 'ja', 'ar']
      })
      return
    }

    console.log(`🔍 Analyzing text: "${text.substring(0, 100)}..."`)

    // Parse text with compromise
    const doc = nlp(text)
    
    // Extract basic elements - using correct compromise API
    const analysis = {
      language: 'en',
      originalText: text,
      wordCount: doc.terms().length,
      sentenceCount: doc.sentences().length,
      
      // Parts of speech
      nouns: doc.nouns().out('array'),
      verbs: doc.verbs().out('array'),
      adjectives: doc.adjectives().out('array'),
      adverbs: doc.adverbs().out('array'),
      
      // New: Prepositions and other parts of speech
      prepositions: extractPrepositions(doc, text),
      conjunctions: extractConjunctions(doc, text),
      articles: extractArticles(doc, text),
      
      // Entities - using correct compromise API
      people: doc.match('#Person').out('array'),
      places: doc.match('#Place').out('array'),
      organizations: doc.match('#Organization').out('array'),
      
      // Numbers and dates - using correct compromise API
      numbers: doc.match('#Number').out('array'),
      dates: doc.match('#Date').out('array'),
      
      // Custom graph-specific analysis
      relations: extractRelations(doc, text),
      attributes: extractAttributes(doc, text),
      processes: extractProcesses(doc, text),
      states: extractStates(doc, text),
      functions: extractFunctions(doc, text),
      
      // New: Categorized linguistic analysis
      nounCategories: categorizeNouns(doc, text),
      logicalConnectives: extractLogicalConnectives(doc, text),
      
      // Enhanced metadata
      textType: determineTextType(text),
      complexity: assessComplexity(text),
      graphBuildingPotential: assessGraphBuildingPotential(text)
    }

    console.log(`✅ Analysis complete: ${analysis.nouns.length} nouns, ${analysis.verbs.length} verbs`)
    
    return {
      success: true,
      analysis,
      suggestions: generateSuggestions(analysis),
      cost: {
        local: 'Free',
        ai: 'Not used',
        total: 'Free'
      }
    }

  } catch (error) {
    console.error('❌ Text analysis failed:', error)
    reply.code(500).send({ error: error.message })
  }
})

// Graph suggestions endpoint
fastify.post('/api/nlp/suggest-graph', async (request, reply) => {
  try {
    const { analysis } = request.body
    
    if (!analysis) {
      reply.code(400).send({ error: 'Analysis data is required' })
      return
    }

    const suggestions = {
      nodes: analysis.nouns.map(noun => ({
        type: 'entity',
        label: noun,
        confidence: 0.9,
        suggestion: `Create a node for "${noun}"`
      })),
      
      relations: analysis.relations.map(rel => ({
        from: rel.from,
        to: rel.to,
        label: rel.verb,
        confidence: rel.confidence,
        suggestion: `Connect "${rel.from}" to "${rel.to}" with relation "${rel.verb}"`
      })),
      
      attributes: analysis.attributes.map(attr => ({
        node: attr.entity,
        key: attr.key,
        value: attr.value,
        confidence: 0.8,
        suggestion: `Add attribute "${attr.key}: ${attr.value}" to "${attr.entity}"`
      })),
      
      processes: analysis.processes.map(proc => ({
        type: 'process',
        label: proc.label,
        confidence: proc.confidence,
        suggestion: `Model this as a process: "${proc.label}"`
      })),
      
      states: analysis.states.map(state => ({
        type: 'state',
        label: state.label,
        prior: state.prior,
        post: state.post,
        confidence: state.confidence,
        suggestion: `Use TransitionMap mode: ${state.prior} → ${state.post}`
      })),
      
      functions: analysis.functions.map(func => ({
        type: 'function',
        label: func.label,
        expression: func.expression,
        confidence: func.confidence,
        suggestion: `Use FunctionMap mode: ${func.expression}`
      }))
    }

    return {
      success: true,
      suggestions,
      graphMode: suggestGraphMode(analysis),
      learningTips: generateLearningTips(analysis)
    }

  } catch (error) {
    console.error('❌ Graph suggestions failed:', error)
    reply.code(500).send({ error: error.message })
  }
})

// Learning tips endpoint
fastify.get('/api/nlp/learning-tips', async (request, reply) => {
  const tips = {
    grammar: [
      'Use clear, simple sentences for better graph mapping',
      'Connect related concepts with action verbs',
      'Be specific about relationships between entities'
    ],
    graphBuilding: [
      'Start with main entities (nouns)',
      'Connect entities with meaningful relations (verbs)',
      'Add attributes to provide more detail',
      'Consider using different graph modes for different content types'
    ],
    costOptimization: [
      'Local NLP analysis is always free',
      'Use AI enhancement only for complex cases',
      'Consider Gemini free tier for cost-effective AI analysis',
      'Local LLMs provide unlimited free processing'
    ]
  }
  
  return { success: true, tips }
})

// Helper function to extract meaningful relations (not every phrase)
function extractRelations(doc, text) {
  const relations = []
  const sentences = doc.sentences().out('array')
  
  sentences.forEach(sentence => {
    // Look for subject-verb-object patterns
    const verbs = doc.match(sentence).verbs().out('array')
    const nouns = doc.match(sentence).nouns().out('array')
    
    if (verbs.length > 0 && nouns.length >= 2) {
      // Find the main subject and object
      const mainSubject = nouns[0] // First noun is usually the subject
      const mainObject = nouns[nouns.length - 1] // Last noun is often the object
      const mainVerb = verbs[0]
      
      if (mainSubject && mainObject && mainVerb && mainSubject !== mainObject) {
        relations.push({
          from: mainSubject,
          to: mainObject,
          verb: mainVerb,
          confidence: 0.9,
          sentence: sentence,
          type: 'subject-verb-object'
        })
      }
    }
  })
  
  return relations
}

// Helper function to extract meaningful attributes (not every adjective)
function extractAttributes(doc, text) {
  const attributes = []
  
  // Look for descriptive patterns: "X is Y" or "X has Y"
  const sentences = doc.sentences().out('array')
  
  sentences.forEach(sentence => {
    // Pattern: "X is Y" -> attribute
    if (sentence.includes(' is ') && sentence.includes(' the ')) {
      const parts = sentence.split(' is ')
      if (parts.length === 2) {
        const entity = parts[0].trim()
        const description = parts[1].trim()
        
        // Only add if it's meaningful (not just "It is")
        if (entity.length > 2 && !entity.toLowerCase().includes('it')) {
          attributes.push({
            entity: entity,
            key: 'type',
            value: description,
            confidence: 0.8,
            pattern: 'is-relation'
          })
        }
      }
    }
    
    // Pattern: "X covers Y" -> spatial attribute
    if (sentence.includes(' covers ')) {
      const parts = sentence.split(' covers ')
      if (parts.length === 2) {
        const entity = parts[0].trim()
        const area = parts[1].trim()
        
        if (area.includes('area') || area.includes('kilometres')) {
          attributes.push({
            entity: entity,
            key: 'area',
            value: area,
            confidence: 0.9,
            pattern: 'spatial-coverage'
          })
        }
      }
    }
  })
  
  return attributes
}

// Helper function to extract logical connectives and relationships
function extractLogicalConnectives(doc, text) {
  const connectives = []
  
  // Common logical connectives
  const logicalWords = ['both', 'and', 'or', 'but', 'however', 'therefore', 'because', 'since', 'while', 'although']
  
  logicalWords.forEach(word => {
    if (text.toLowerCase().includes(word.toLowerCase())) {
      connectives.push({
        word: word,
        type: 'logical-connective',
        function: getConnectiveFunction(word),
        confidence: 0.8
      })
    }
  })
  
  return connectives
}

// Helper function to categorize nouns by type
function categorizeNouns(doc, text) {
  const nouns = doc.nouns().out('array')
  const categorized = {
    properNouns: [],
    commonNouns: [],
    concepts: [],
    measurements: []
  }
  
  nouns.forEach(noun => {
    const cleanNoun = noun.trim()
    
    // Proper nouns (capitalized, specific entities)
    if (/^[A-Z]/.test(cleanNoun) && cleanNoun.length > 2) {
      categorized.properNouns.push({
        text: cleanNoun,
        type: 'proper-noun',
        confidence: 0.9
      })
    }
    // Measurements (numbers with units)
    else if (/\d/.test(cleanNoun) && (cleanNoun.includes('area') || cleanNoun.includes('kilometres') || cleanNoun.includes('million'))) {
      categorized.measurements.push({
        text: cleanNoun,
        type: 'measurement',
        confidence: 0.8
      })
    }
    // Concepts (abstract ideas)
    else if (cleanNoun.includes('continent') || cleanNoun.includes('population') || cleanNoun.includes('world')) {
      categorized.concepts.push({
        text: cleanNoun,
        type: 'concept',
        confidence: 0.8
      })
    }
    // Common nouns
    else {
      categorized.commonNouns.push({
        text: cleanNoun,
        type: 'common-noun',
        confidence: 0.7
      })
    }
  })
  
  return categorized
}

// Helper function to get connective function
function getConnectiveFunction(word) {
  const functions = {
    'both': 'enumeration',
    'and': 'addition',
    'or': 'alternative',
    'but': 'contrast',
    'however': 'contrast',
    'therefore': 'conclusion',
    'because': 'causation',
    'since': 'causation',
    'while': 'temporal',
    'although': 'concession'
  }
  return functions[word.toLowerCase()] || 'unknown'
}

// Helper function to extract processes (actions and changes)
function extractProcesses(doc, text) {
  const processes = []
  const verbs = doc.verbs().out('array')
  
  verbs.forEach(verb => {
    if (verb.length > 2) {
      processes.push({
        label: verb,
        confidence: 0.8,
        keyword: verb,
        type: 'action'
      })
    }
  })
  
  return processes
}

// Helper function to extract states (before/after conditions)
function extractStates(doc, text) {
  const states = []
  
  // Look for comparative patterns
  if (text.includes('largest') || text.includes('more than') || text.includes('about')) {
    states.push({
      label: 'Comparative Analysis',
      prior: 'Before measurement',
      post: 'After measurement',
      confidence: 0.7,
      type: 'comparison'
    })
  }
  
  return states
}

// Helper function to extract functions (mathematical relationships)
function extractFunctions(doc, text) {
  const functions = []
  
  // Look for percentage patterns
  if (text.includes('%') || text.includes('percent')) {
    functions.push({
      label: 'Percentage Calculation',
      expression: 'X% of Y',
      confidence: 0.8,
      keyword: 'percentage',
      type: 'mathematical'
    })
  }
  
  // Look for area calculations
  if (text.includes('square kilometres') && text.includes('million')) {
    functions.push({
      label: 'Area Measurement',
      expression: 'Area = X square kilometres',
      confidence: 0.9,
      keyword: 'area',
      type: 'measurement'
    })
  }
  
  return functions
}

// Helper function to extract prepositions
function extractPrepositions(doc, text) {
  const prepositions = []
  
  // Common prepositions
  const commonPrepositions = [
    'in', 'on', 'at', 'by', 'for', 'of', 'with', 'to', 'from', 'about', 
    'over', 'under', 'between', 'among', 'through', 'during', 'before', 
    'after', 'since', 'until', 'within', 'without', 'against', 'toward',
    'across', 'behind', 'beneath', 'beyond', 'inside', 'outside', 'near'
  ]
  
  // Look for prepositions in the text
  commonPrepositions.forEach(prep => {
    if (text.toLowerCase().includes(` ${prep} `)) {
      prepositions.push({
        word: prep,
        type: 'preposition',
        function: getPrepositionFunction(prep),
        confidence: 0.8
      })
    }
  })
  
  return prepositions
}

// Helper function to extract conjunctions
function extractConjunctions(doc, text) {
  const conjunctions = []
  
  // Common conjunctions
  const commonConjunctions = [
    'and', 'or', 'but', 'nor', 'yet', 'so', 'because', 'although', 
    'since', 'unless', 'while', 'where', 'when', 'if', 'whether'
  ]
  
  // Look for conjunctions in the text
  commonConjunctions.forEach(conj => {
    if (text.toLowerCase().includes(` ${conj} `)) {
      conjunctions.push({
        word: conj,
        type: 'conjunction',
        function: getConjunctionFunction(conj),
        confidence: 0.8
      })
    }
  })
  
  return conjunctions
}

// Helper function to extract articles
function extractArticles(doc, text) {
  const articles = []
  
  // Common articles
  const commonArticles = ['a', 'an', 'the']
  
  // Look for articles in the text
  commonArticles.forEach(article => {
    if (text.toLowerCase().includes(` ${article} `)) {
      articles.push({
        word: article,
        type: 'article',
        function: getArticleFunction(article),
        confidence: 0.8
      })
    }
  })
  
  return articles
}

// Helper function to get preposition function
function getPrepositionFunction(prep) {
  const functions = {
    'in': 'location/containment',
    'on': 'surface/contact',
    'at': 'specific point',
    'by': 'agent/method',
    'for': 'purpose/benefit',
    'of': 'possession/relation',
    'with': 'accompaniment/means',
    'to': 'direction/target',
    'from': 'source/origin',
    'about': 'topic/approximation',
    'over': 'above/across',
    'under': 'below/subjection',
    'between': 'two entities',
    'among': 'multiple entities',
    'through': 'passage/method',
    'during': 'time period',
    'before': 'time precedence',
    'after': 'time sequence',
    'since': 'time starting point',
    'until': 'time ending point',
    'within': 'boundaries',
    'without': 'absence',
    'against': 'opposition',
    'toward': 'direction',
    'across': 'traversal',
    'behind': 'position',
    'beneath': 'below',
    'beyond': 'exceeding',
    'inside': 'containment',
    'outside': 'exclusion',
    'near': 'proximity'
  }
  return functions[prep.toLowerCase()] || 'spatial/temporal relation'
}

// Helper function to get conjunction function
function getConjunctionFunction(conj) {
  const functions = {
    'and': 'addition',
    'or': 'alternative',
    'but': 'contrast',
    'nor': 'negative addition',
    'yet': 'contrast',
    'so': 'consequence',
    'because': 'causation',
    'although': 'concession',
    'since': 'causation/time',
    'unless': 'condition',
    'while': 'simultaneity',
    'where': 'location',
    'when': 'time',
    'if': 'condition',
    'whether': 'choice'
  }
  return functions[conj.toLowerCase()] || 'logical connection'
}

// Helper function to get article function
function getArticleFunction(article) {
  const functions = {
    'a': 'indefinite singular',
    'an': 'indefinite singular (vowel)',
    'the': 'definite specific'
  }
  return functions[article.toLowerCase()] || 'determiner'
}

// Helper function to determine text type
function determineTextType(text) {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('continent') || lowerText.includes('country') || lowerText.includes('geography')) {
    return 'geographical'
  } else if (lowerText.includes('process') || lowerText.includes('transforms') || lowerText.includes('changes')) {
    return 'process'
  } else if (lowerText.includes('function') || lowerText.includes('calculate') || lowerText.includes('formula')) {
    return 'mathematical'
  } else if (lowerText.includes('compare') || lowerText.includes('larger') || lowerText.includes('smaller')) {
    return 'comparative'
  } else {
    return 'descriptive'
  }
}

// Helper function to assess text complexity
function assessComplexity(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  const avgWordsPerSentence = words.length / sentences.length
  
  if (avgWordsPerSentence > 20) return 'high'
  if (avgWordsPerSentence > 15) return 'medium'
  return 'low'
}

// Helper function to assess graph building potential
function assessGraphBuildingPotential(text) {
  let score = 0
  
  // Bonus for proper nouns (specific entities)
  if (text.match(/[A-Z][a-z]+/g)) score += 2
  
  // Bonus for numbers and measurements
  if (/\d/.test(text)) score += 1
  
  // Bonus for comparative language
  if (text.includes('largest') || text.includes('smallest') || text.includes('more than')) score += 2
  
  // Bonus for logical connectives
  if (text.includes('and') || text.includes('or') || text.includes('but')) score += 1
  
  // Bonus for spatial relationships
  if (text.includes('covers') || text.includes('area') || text.includes('within')) score += 2
  
  if (score >= 6) return 'excellent'
  if (score >= 4) return 'good'
  if (score >= 2) return 'fair'
  return 'basic'
}

function generateSuggestions(analysis) {
  const suggestions = []
  
  // Text structure suggestions
  if (analysis.wordCount < 20) {
    suggestions.push('💡 Consider adding more detail to create richer graph relationships')
  }
  
  if (analysis.sentenceCount === 1) {
    suggestions.push('💡 Breaking text into multiple sentences can help identify distinct concepts')
  }
  
  // Linguistic suggestions
  if (analysis.nounCategories.properNouns.length === 0) {
    suggestions.push('💡 Add specific names or places to create concrete entities for your graph')
  }
  
  if (analysis.logicalConnectives.length === 0) {
    suggestions.push('💡 Use logical connectives (and, or, but, because) to show relationships')
  }
  
  if (analysis.attributes.length === 0) {
    suggestions.push('💡 Add descriptive attributes to make entities more informative')
  }
  
  // Graph building suggestions
  if (analysis.graphBuildingPotential === 'excellent') {
    suggestions.push('✅ Excellent text for graph building! You have specific entities, relationships, and measurements')
  } else if (analysis.graphBuildingPotential === 'good') {
    suggestions.push('👍 Good foundation for a graph. Consider adding more specific relationships')
  } else {
    suggestions.push('💪 Basic text structure. Add more specific entities and relationships for better graphs')
  }
  
  // Text type specific suggestions
  if (analysis.textType === 'geographical') {
    suggestions.push('🗺️ Geographical text detected! Consider using spatial relationships and area measurements')
  } else if (analysis.textType === 'comparative') {
    suggestions.push('⚖️ Comparative text detected! Use comparison nodes and relationship arrows')
  } else if (analysis.textType === 'mathematical') {
    suggestions.push('🧮 Mathematical text detected! Consider function nodes and calculation flows')
  }
  
  return suggestions
}

function suggestGraphMode(analysis) {
  if (analysis.states.length > 0) {
    return 'TransitionMap'
  } else if (analysis.functions.length > 0) {
    return 'FunctionMap'
  } else if (analysis.processes.length > 0) {
    return 'ConceptMap'
  } else {
    return 'MindMap'
  }
}

function generateLearningTips(analysis) {
  const tips = []
  
  if (analysis.wordCount < 10) {
    tips.push('Consider adding more detail to help with graph creation')
  }
  
  if (analysis.sentenceCount === 1) {
    tips.push('Breaking text into multiple sentences can help identify different concepts')
  }
  
  return tips
}

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3002
    await fastify.listen({ port, host: '0.0.0.0' })
    console.log(`🚀 NLP Service running on port ${port}`)
    console.log(`📚 Capabilities: English grammar analysis with compromise`)
    console.log(`🤖 AI integration: Planned for next phase`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()
