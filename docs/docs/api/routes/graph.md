# Graph Routes

Graph routes provide basic graph management and visualization endpoints.

## Overview

The graph routes module handles fundamental graph operations including graph creation, basic queries, and graph visualization endpoints.

## Key Endpoints

### Graph Management
- `GET /graph` - Get basic graph information
- `POST /graph` - Create new graph
- `PUT /graph` - Update graph properties
- `DELETE /graph` - Delete graph

### Graph Queries
- `GET /graph/nodes` - Get all nodes in graph
- `GET /graph/edges` - Get all edges in graph
- `GET /graph/structure` - Get graph structure

### Graph Visualization
- `GET /graph/visualize` - Get graph visualization data
- `POST /graph/layout` - Apply layout algorithm

## Usage Examples

### Getting Graph Information
```python
import requests

response = requests.get("http://localhost:8000/graph")
graph_info = response.json()
print(f"Graph has {graph_info['node_count']} nodes and {graph_info['edge_count']} edges")
```

### Creating a New Graph
```python
graph_data = {
    "name": "my_graph",
    "description": "A sample graph",
    "type": "concept_graph"
}

response = requests.post("http://localhost:8000/graph", json=graph_data)
```

### Getting Graph Visualization Data
```python
response = requests.get("http://localhost:8000/graph/visualize")
visualization_data = response.json()
# Use with Cytoscape or other visualization libraries
```

## Graph Properties

Graphs can have various properties:
- Name and description
- Graph type (concept, knowledge, etc.)
- Metadata and tags
- Creation and modification timestamps

## Error Handling

- `200` - Success
- `400` - Invalid graph data
- `404` - Graph not found
- `500` - Internal server error

## Dependencies

- Graph state management
- Basic graph operations
- Visualization utilities 