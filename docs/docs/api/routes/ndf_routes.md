# NDF Routes

NDF (Node Definition Format) routes provide API endpoints for managing node definitions and related operations.

## Overview

The NDF routes module handles operations related to node definitions, including creation, updates, validation, and management of node structures.

## Key Endpoints

### Node Definition Management
- `POST /ndf/nodes` - Create new node definitions
- `GET /ndf/nodes` - Retrieve node definitions
- `PUT /ndf/nodes/{node_id}` - Update node definitions
- `DELETE /ndf/nodes/{node_id}` - Delete node definitions

### Node Validation
- `POST /ndf/validate` - Validate node definition structure
- `GET /ndf/schema` - Get NDF schema information

### Node Operations
- `POST /ndf/compose` - Compose complex node structures
- `GET /ndf/export` - Export node definitions
- `POST /ndf/import` - Import node definitions

## Usage Examples

### Creating a Node Definition
```python
import requests

node_data = {
    "name": "example_node",
    "type": "concept",
    "attributes": {
        "description": "An example node",
        "category": "examples"
    }
}

response = requests.post("http://localhost:8000/ndf/nodes", json=node_data)
```

### Validating Node Structure
```python
response = requests.post("http://localhost:8000/ndf/validate", json=node_data)
if response.status_code == 200:
    print("Node definition is valid")
else:
    print("Validation errors:", response.json())
```

## Error Handling

The NDF routes return appropriate HTTP status codes:
- `200` - Success
- `400` - Bad request (invalid data)
- `404` - Node not found
- `422` - Validation error
- `500` - Internal server error

## Dependencies

- Core NDF operations module
- Node validation utilities
- Schema management functions 