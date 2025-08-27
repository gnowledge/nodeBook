# WordNet Service

A microservice for providing WordNet definitions and related terms to NodeBook, enabling auto-filling of node descriptions with authoritative, standardized definitions.

## Features

- **Term Definitions**: Get multiple definition options for any term
- **Batch Processing**: Process multiple terms simultaneously
- **Related Terms**: Find hypernyms, hyponyms, synonyms, antonyms, etc.
- **Educational Focus**: Standardized sentence structures for learning
- **Free & Open Source**: Built on WordNet database

## API Endpoints

### Health Check
```
GET /health
```

### Get Definitions
```
GET /api/wordnet/definitions/:term?maxResults=3
```

### Batch Definitions
```
POST /api/wordnet/definitions/batch
{
  "terms": ["term1", "term2", "term3"],
  "maxResults": 3
}
```

### Related Terms
```
GET /api/wordnet/related/:term?relationType=all
```

## Usage

### Development
```bash
npm install
npm run dev
```

### Production
```bash
npm install
npm start
```

### Docker
```bash
docker build -t wordnet-service .
docker run -p 3003:3003 wordnet-service
```

## Integration with NodeBook

This service integrates with the CNL Editor to:
1. Detect nodes without descriptions
2. Provide WordNet definitions
3. Auto-fill descriptions with user selection
4. Enhance learning through standardized definitions

## WordNet Database

- **Source**: Princeton WordNet
- **License**: Free for educational use
- **Coverage**: Comprehensive English vocabulary
- **Structure**: Synsets, hypernyms, hyponyms, relations

## Future Enhancements

- Multi-language support
- Domain-specific definitions
- Definition difficulty levels
- Interactive concept exploration
- Knowledge graph integration
