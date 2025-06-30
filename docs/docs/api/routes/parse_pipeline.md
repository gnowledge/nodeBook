# Parse Pipeline Routes

Parse pipeline routes handle the processing and parsing of various input formats into structured node definitions.

## Overview

The parse pipeline module provides endpoints for processing different input formats (CNL, markdown, JSON) and converting them into structured node definitions that can be used by the NDF system.

## Key Endpoints

### Pipeline Processing
- `POST /parse/cnl` - Parse CNL (Controlled Natural Language) input
- `POST /parse/markdown` - Parse markdown documents
- `POST /parse/json` - Parse JSON structures
- `POST /parse/validate` - Validate parsed structures

### Pipeline Management
- `GET /parse/pipelines` - List available parsing pipelines
- `POST /parse/pipelines` - Create custom parsing pipeline
- `PUT /parse/pipelines/{pipeline_id}` - Update parsing pipeline
- `DELETE /parse/pipelines/{pipeline_id}` - Delete parsing pipeline

## Usage Examples

### Parsing CNL Input
```python
import requests

cnl_text = """
There is a concept called "oxygen" that has:
- atomic number: 8
- symbol: O
- category: chemical element
"""

response = requests.post("http://localhost:8000/parse/cnl", json={"text": cnl_text})
parsed_nodes = response.json()
```

### Parsing Markdown
```python
markdown_content = """
# Oxygen

Oxygen is a chemical element with:
- Atomic number: 8
- Symbol: O
- Category: Chemical element
"""

response = requests.post("http://localhost:8000/parse/markdown", json={"content": markdown_content})
```

## Pipeline Configuration

Parsing pipelines can be configured with various options:
- Input format detection
- Output format specification
- Validation rules
- Custom parsing rules

## Error Handling

- `200` - Successful parsing
- `400` - Invalid input format
- `422` - Parsing errors
- `500` - Pipeline processing error

## Dependencies

- CNL parser module
- Markdown processing utilities
- JSON schema validation
- Node structure validation 