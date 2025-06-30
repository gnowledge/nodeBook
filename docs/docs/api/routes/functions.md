# Functions Routes

Functions routes provide endpoints for managing and executing custom functions within the NDF system.

## Overview

The functions routes module handles the registration, execution, and management of custom functions that can be used to process nodes, perform calculations, or implement business logic.

## Key Endpoints

### Function Management
- `GET /functions` - List all available functions
- `POST /functions` - Register new function
- `PUT /functions/{function_id}` - Update function definition
- `DELETE /functions/{function_id}` - Remove function

### Function Execution
- `POST /functions/{function_id}/execute` - Execute function with parameters
- `POST /functions/batch` - Execute multiple functions
- `GET /functions/{function_id}/status` - Get function execution status

### Function Metadata
- `GET /functions/{function_id}` - Get function details
- `GET /functions/{function_id}/schema` - Get function input/output schema

## Usage Examples

### Registering a Custom Function
```python
import requests

function_def = {
    "name": "calculate_molecular_weight",
    "description": "Calculate molecular weight from chemical formula",
    "parameters": {
        "formula": {"type": "string", "required": True}
    },
    "code": "def calculate_molecular_weight(formula): ..."
}

response = requests.post("http://localhost:8000/functions", json=function_def)
```

### Executing a Function
```python
params = {"formula": "H2O"}
response = requests.post("http://localhost:8000/functions/calculate_molecular_weight/execute", 
                        json=params)
result = response.json()
print(f"Molecular weight: {result['result']}")
```

### Listing Available Functions
```python
response = requests.get("http://localhost:8000/functions")
functions = response.json()
for func in functions:
    print(f"- {func['name']}: {func['description']}")
```

## Function Types

Functions can be categorized by type:
- **Node Processing**: Functions that transform or analyze nodes
- **Calculation**: Mathematical and computational functions
- **Validation**: Functions that validate data structures
- **Utility**: Helper functions for common operations

## Error Handling

- `200` - Success
- `400` - Invalid function definition or parameters
- `404` - Function not found
- `422` - Function execution error
- `500` - Internal server error

## Dependencies

- Function execution engine
- Parameter validation
- Security sandboxing
- Result caching 