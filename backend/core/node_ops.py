import os
import yaml
from fastapi import HTTPException

GRAPH_DATA_PATH = "graph_data"

def node_path(node_id: str) -> str:
    """Return the full file path for a node ID."""
    return os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")

def load_node(node_id: str) -> dict:
    """Load a node from its YAML file."""
    path = node_path(node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def save_node(node_id: str, data: dict):
    """Save a node's data to its YAML file."""
    path = node_path(node_id)
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)
