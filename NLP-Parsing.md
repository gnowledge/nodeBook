# NLP Parsing

## Overview
NodeBook is designed to enable parsing text into graphs. This requires that learners use their basic grammar, various POS elements of sentence construction, which help in deciding what will go as relation, attribute, adjective and adverb, sentence connectives, quantifiers and modalities. To train learners to this objective, we want to include a lightweight NLP parser in the backend, which would parse the text provided in the description, as a guide to graph building.

## Strategy: Unified NLP Microservice

### Architecture Decision
After evaluating multiple NLP libraries and approaches, we've decided to create a **unified NLP microservice** that combines:

1. **Local NLP Processing** - Fast, free, privacy-focused analysis
2. **AI Model Integration** - Professional enhancement when needed
3. **Cost Optimization** - Guide users to free/affordable options
4. **Educational Guidance** - Learning tips and graph building suggestions

### Why This Approach?

#### Local NLP Benefits:
- **Immediate feedback** for learners
- **No cost** for basic analysis
- **Privacy protection** for sensitive content
- **Fast response** times
- **Offline capability**

#### AI Model Benefits:
- **Professional quality** analysis
- **Complex reasoning** capabilities
- **Multi-language support** (70+ languages)
- **Advanced pattern recognition**
- **Contextual understanding**

#### Combined Value:
- **Best of both worlds** - local speed + AI quality
- **Cost-conscious** - use AI only when needed
- **Educational** - teach grammar while providing AI insights
- **Scalable** - can add more AI providers over time

## Technical Implementation

### Service Structure
```
nlp-service/
├── src/
│   ├── local-nlp/          # compromise, spacy-js
│   ├── ai-models/          # OpenAI, Claude, Gemini
│   ├── user-management/     # API keys, preferences
│   ├── cost-optimization/   # Smart provider selection
│   └── graph-suggestions/   # Graph building guidance
├── config/
│   ├── ai-providers.json    # Provider configurations
│   └── cost-limits.json     # User cost preferences
└── docker-compose.yml       # Service definition
```

### Local NLP Components
- **compromise** - Excellent English grammar analysis
- **spacy-js** - Multi-language support and dependency parsing
- **Custom rules** - Graph-specific parsing for relations, attributes, processes, states, functions

### AI Model Providers
| Provider | Cost | Free Tier | Best For |
|----------|------|-----------|----------|
| **Google Gemini** | $0.0005/1K tokens | ✅ Yes | Cost-effective, good quality |
| **Anthropic Claude** | $0.015/1K tokens | ❌ No | Educational content, safety |
| **OpenAI GPT-4** | $0.03/1K tokens | ❌ No | Complex reasoning, detailed analysis |
| **Local LLMs** | Free (one-time setup) | ✅ Yes | Privacy, offline, unlimited |

### Core Features

#### 1. Text Analysis & Parsing
- **Grammar analysis** - Parts of speech, sentence structure
- **Entity extraction** - Nouns, verbs, adjectives
- **Relation identification** - Connections between entities
- **Attribute detection** - Properties and characteristics
- **Process recognition** - Workflows and transformations
- **State identification** - Prior states, post states, current states
- **Function detection** - Mathematical and computational operations

#### 2. Graph Building Guidance
- **Node suggestions** - What entities to create
- **Relation mapping** - How to connect nodes
- **Attribute assignment** - What properties to add
- **Process modeling** - How to represent workflows
- **State transitions** - How to model state changes
- **Function implementation** - How to handle derived attributes

#### 3. Learning Support
- **Grammar tips** - Improve sentence structure
- **Cost optimization** - Use free options when possible
- **Best practices** - Graph design recommendations
- **Alternative suggestions** - Different ways to model concepts

### API Endpoints

#### Core NLP
- `POST /api/nlp/analyze` - Text analysis and parsing
- `POST /api/nlp/suggest-graph` - Graph structure suggestions
- `GET /api/nlp/learning-tips` - Educational guidance

#### AI Model Management
- `POST /api/nlp/ai/enhance` - AI-powered enhancement
- `GET /api/nlp/ai/providers` - Available AI providers
- `POST /api/nlp/ai/keys` - Manage API keys

#### User Configuration
- `GET /api/nlp/user/config` - User settings and preferences
- `POST /api/nlp/user/config` - Update preferences

### User Experience

#### Frontend Integration
The frontend will use the results of parsing and provide suggestions to the user, preferably as a modal when we click on the text block in the NodeCard.

#### Interactive Features
- **Click on text** → Show parsing breakdown
- **Highlight parts** → Explain grammar roles
- **Suggest improvements** → Guide better graph construction
- **Interactive examples** → Show how text maps to graph
- **Cost analysis** → Show what each analysis costs
- **Learning tips** → Educational guidance for improvement

### Cost Management Strategy

#### Smart Provider Selection
1. **Always use local NLP first** - Free, fast, private
2. **Use AI only for complex cases** - When local analysis is insufficient
3. **Guide users to free options** - Gemini free tier, local LLMs
4. **Cost transparency** - Show what each enhancement costs
5. **Budget management** - Help users stay within cost limits

#### Free Alternatives
- **Local processing** for basic analysis
- **Gemini free tier** for AI enhancement
- **Self-hosted models** for unlimited use
- **Community models** for cost sharing

## Implementation Phases

### Phase 1: Core NLP Microservice
- [ ] Service structure and basic setup
- [ ] Local NLP with compromise (English)
- [ ] Basic text analysis endpoints
- [ ] Integration with main development environment

### Phase 2: AI Model Integration
- [ ] AI provider configurations
- [ ] API key management
- [ ] Cost analysis and optimization
- [ ] Smart provider selection

### Phase 3: Advanced Features
- [ ] Multi-language support with spacy-js
- [ ] Graph building suggestions
- [ ] Learning tips and educational content
- [ ] Cost management dashboard

### Phase 4: Frontend Integration
- [ ] Interactive parsing modal
- [ ] Real-time suggestions
- [ ] Cost transparency display
- [ ] Learning guidance interface

## Expected Outcomes

### For Learners
- **Better understanding** of grammar and sentence structure
- **Guided graph building** with intelligent suggestions
- **Cost-effective learning** using free tools when possible
- **Professional insights** when AI enhancement is needed

### For NodeBook
- **Unique positioning** as the only educational graph tool with AI guidance
- **Global accessibility** through multi-language support
- **Scalable architecture** that can grow with user needs
- **Competitive advantage** in the educational technology space

### For Education
- **Bridging language** and visual thinking
- **Making grammar fun** through interactive parsing
- **Cost-conscious AI** integration for educational institutions
- **Privacy protection** for sensitive educational content

## Next Steps
1. Create the NLP microservice structure
2. Implement local NLP with compromise
3. Set up AI model integration
4. Design user interface for API key management
5. Create cost optimization algorithms
6. Integrate with existing NodeBook frontend

This unified approach will make NodeBook a truly unique and powerful tool for learning graph creation, combining the best of local processing with AI enhancement while keeping costs low for learners. 