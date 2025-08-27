# 🧠 NodeBook NLP Service

A microservice providing natural language processing capabilities for NodeBook, including text analysis, grammar parsing, and graph building suggestions.

## 🚀 Features

### Current (Phase 1)
- **English Grammar Analysis** using compromise library
- **Text Parsing** - Parts of speech, entities, relationships
- **Graph Suggestions** - Node, relation, and attribute recommendations
- **Learning Tips** - Educational guidance for better graph creation
- **Cost Analysis** - Always free with local processing

### Planned (Phase 2)
- **AI Model Integration** - OpenAI, Claude, Gemini
- **Multi-language Support** - Spanish, French, German, etc.
- **Advanced Parsing** - Dependency analysis, logical connectives
- **Cost Optimization** - Smart provider selection

## 🔧 Quick Start

### Using Docker
```bash
# Build and start the service
docker compose up -d

# Check health
curl http://localhost:3002/health
```

### Using Node.js
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```

### Text Analysis
```bash
POST /api/nlp/analyze
Content-Type: application/json

{
  "text": "The quick brown fox jumps over the lazy dog",
  "language": "en"
}
```

### Graph Suggestions
```bash
POST /api/nlp/suggest-graph
Content-Type: application/json

{
  "analysis": { /* analysis result from /analyze */ }
}
```

### Learning Tips
```bash
GET /api/nlp/learning-tips
```

## 📊 Example Response

### Text Analysis
```json
{
  "success": true,
  "analysis": {
    "language": "en",
    "wordCount": 9,
    "sentenceCount": 1,
    "nouns": ["fox", "dog"],
    "verbs": ["jumps"],
    "adjectives": ["quick", "brown", "lazy"],
    "relations": [
      {
        "from": "fox",
        "to": "dog",
        "verb": "jumps",
        "confidence": 0.8
      }
    ]
  },
  "suggestions": [
    "Create a node for 'fox'",
    "Create a node for 'dog'",
    "Connect 'fox' to 'dog' with relation 'jumps'"
  ],
  "cost": {
    "local": "Free",
    "ai": "Not used",
    "total": "Free"
  }
}
```

### Graph Suggestions
```json
{
  "success": true,
  "suggestions": {
    "nodes": [
      {
        "type": "entity",
        "label": "fox",
        "confidence": 0.9,
        "suggestion": "Create a node for 'fox'"
      }
    ],
    "relations": [
      {
        "from": "fox",
        "to": "dog",
        "label": "jumps",
        "confidence": 0.8,
        "suggestion": "Connect 'fox' to 'dog' with relation 'jumps'"
      }
    ]
  },
  "graphMode": "MindMap",
  "learningTips": [
    "Consider adding more detail to help with graph creation"
  ]
}
```

## 🎯 Use Cases

### 1. Educational Graph Building
- Parse student descriptions
- Suggest graph structure
- Provide learning guidance
- Identify graph modes (MindMap, ConceptMap, etc.)

### 2. Content Analysis
- Extract entities and relationships
- Identify processes and states
- Detect mathematical functions
- Suggest improvements

### 3. Learning Support
- Grammar tips and suggestions
- Best practices for graph creation
- Cost optimization guidance
- Multi-language support (planned)

## 🔍 Supported Text Types

### MindMap Mode
- Hierarchical concepts
- Simple relationships
- Descriptive attributes

### ConceptMap Mode
- Process descriptions
- Workflow modeling
- Cause-and-effect relationships

### TransitionMap Mode
- State changes
- Process flows
- Before/after scenarios

### FunctionMap Mode
- Mathematical expressions
- Derived attributes
- Computational relationships

## 🚧 Development

### Prerequisites
- Node.js 18+
- Docker (optional)

### Local Development
```bash
# Install dependencies
npm install

# Start with auto-reload
npm run dev

# Start production
npm start
```

### Testing
```bash
# Test health endpoint
curl http://localhost:3002/health

# Test text analysis
curl -X POST http://localhost:3002/api/nlp/analyze \
  -H "Content-Type: application/json" \
  -d '{"text": "The cat sits on the mat"}'
```

## 🔮 Roadmap

### Phase 1: Core NLP ✅
- [x] Basic text analysis
- [x] Grammar parsing
- [x] Graph suggestions
- [x] Learning tips

### Phase 2: AI Integration 🚧
- [ ] OpenAI GPT integration
- [ ] Anthropic Claude integration
- [ ] Google Gemini integration
- [ ] Cost optimization

### Phase 3: Multi-language 🌍
- [ ] Spanish support
- [ ] French support
- [ ] German support
- [ ] Dependency parsing

### Phase 4: Advanced Features 🚀
- [ ] Logical connective identification
- [ ] Advanced grammar analysis
- [ ] Custom rule engine
- [ ] Performance optimization

## 🤝 Contributing

This service is part of the NodeBook project. Contributions are welcome!

## 📄 License

MIT License - see LICENSE file for details.
