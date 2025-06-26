# Validation Decorators Usage Guide

This document explains how to use the validation decorators to ensure proper user and graph existence before executing backend operations.

## Overview

The validation system ensures that:
1. **No operations can be performed without a valid user existing**
2. **No operations can be performed without a valid graph existing for that user**
3. **No operations can be performed on non-existent entities (nodes, relations, attributes)**

## Available Decorators

### 1. `@require_user_and_graph(operation)`
Use this decorator for endpoints that require both a valid user and graph.

**Usage:**
```python
from backend.core.validation import require_user_and_graph

@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
@require_user_and_graph("create node")
def create_node(user_id: str, graph_id: str, node_data: dict):
    # Function will only execute if user and graph exist
    pass

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
@require_user_and_graph("list nodes")
def list_nodes(user_id: str, graph_id: str):
    # Function will only execute if user and graph exist
    pass
```

### 2. `@require_user_exists(operation)`
Use this decorator for endpoints that only require a valid user.

**Usage:**
```python
from backend.core.validation import require_user_exists

@router.get("/users/{user_id}/graphs")
@require_user_exists("list graphs")
def list_user_graphs(user_id: str):
    # Function will only execute if user exists
    pass

@router.post("/users/{user_id}/graphs")
@require_user_exists("create graph")
def create_graph(user_id: str, graph_data: dict):
    # Function will only execute if user exists
    pass
```

### 3. `@require_node_exists(operation)`
Use this decorator for endpoints that require a valid user, graph, and node.

**Usage:**
```python
from backend.core.validation import require_node_exists

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
@require_node_exists("update node")
def update_node(user_id: str, graph_id: str, node_id: str, node_data: dict):
    # Function will only execute if user, graph, and node exist
    pass

@router.delete("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
@require_node_exists("delete node")
def delete_node(user_id: str, graph_id: str, node_id: str):
    # Function will only execute if user, graph, and node exist
    pass
```

### 4. `@require_relation_exists(operation)`
Use this decorator for endpoints that require a valid user, graph, and relation.

**Usage:**
```python
from backend.core.validation import require_relation_exists

@router.put("/users/{user_id}/graphs/{graph_id}/relations/{relation_id}")
@require_relation_exists("update relation")
def update_relation(user_id: str, graph_id: str, relation_id: str, relation_data: dict):
    # Function will only execute if user, graph, and relation exist
    pass

@router.delete("/users/{user_id}/graphs/{graph_id}/relations/{relation_id}")
@require_relation_exists("delete relation")
def delete_relation(user_id: str, graph_id: str, relation_id: str):
    # Function will only execute if user, graph, and relation exist
    pass
```

### 5. `@require_attribute_exists(operation)`
Use this decorator for endpoints that require a valid user, graph, and attribute.

**Usage:**
```python
from backend.core.validation import require_attribute_exists

@router.put("/users/{user_id}/graphs/{graph_id}/attributes/{attribute_id}")
@require_attribute_exists("update attribute")
def update_attribute(user_id: str, graph_id: str, attribute_id: str, attribute_data: dict):
    # Function will only execute if user, graph, and attribute exist
    pass

@router.delete("/users/{user_id}/graphs/{graph_id}/attributes/{attribute_id}")
@require_attribute_exists("delete attribute")
def delete_attribute(user_id: str, graph_id: str, attribute_id: str):
    # Function will only execute if user, graph, and attribute exist
    pass
```

## Error Responses

When validation fails, the decorators return appropriate HTTP error responses:

### User Not Found (404)
```json
{
  "detail": "Cannot create node: User 'nonexistent_user' does not exist"
}
```

### Graph Not Found (404)
```json
{
  "detail": "Cannot create node: Graph 'nonexistent_graph' does not exist for user 'testuser'"
}
```

### Node Not Found (404)
```json
{
  "detail": "Cannot update node: Node 'nonexistent_node' does not exist for user 'testuser'"
}
```

### Invalid Parameters (400)
```json
{
  "detail": "Invalid user_id: must be a non-empty string"
}
```

## Implementation Examples

### Example 1: Node Creation Endpoint
```python
@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
@require_user_and_graph("create node")
def create_node(user_id: str, graph_id: str, node_data: dict):
    # At this point, we know user and graph exist
    # Proceed with node creation logic
    pass
```

### Example 2: Node Update Endpoint
```python
@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
@require_node_exists("update node")
def update_node(user_id: str, graph_id: str, node_id: str, node_data: dict):
    # At this point, we know user, graph, and node exist
    # Proceed with node update logic
    pass
```

### Example 3: Graph Listing Endpoint
```python
@router.get("/users/{user_id}/graphs")
@require_user_exists("list graphs")
def list_graphs(user_id: str):
    # At this point, we know user exists
    # Proceed with graph listing logic
    pass
```

## Benefits

1. **Consistent Validation**: All endpoints use the same validation logic
2. **Clean Code**: No need to repeat validation code in each endpoint
3. **Error Handling**: Consistent error messages across all endpoints
4. **Maintainability**: Changes to validation logic only need to be made in one place
5. **Security**: Prevents operations on non-existent users/graphs/entities

## Testing

The validation decorators are thoroughly tested. Run the tests with:

```bash
cd backend
python -m pytest tests/test_validation.py -v
```

## Migration Guide

To add validation to existing endpoints:

1. **Import the appropriate decorator**
2. **Add the decorator above the endpoint function**
3. **Remove any existing manual validation code**
4. **Test the endpoint with invalid user/graph IDs**

Example migration:
```python
# Before
@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
def create_node(user_id: str, graph_id: str, node_data: dict):
    # Manual validation code here
    if not user_exists(user_id):
        raise HTTPException(status_code=404, detail="User not found")
    if not graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail="Graph not found")
    
    # Node creation logic
    pass

# After
@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
@require_user_and_graph("create node")
def create_node(user_id: str, graph_id: str, node_data: dict):
    # Node creation logic (validation handled by decorator)
    pass
``` 