import json
from pathlib import Path
from datetime import datetime
from core.utils import normalize_id, save_json_file, load_json_file

def get_registry_path(user_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/node_registry.json")

def load_node_registry(user_id: str) -> dict:
    path = get_registry_path(user_id)
    if path.exists():
        return load_json_file(path)
    else:
        return {}

def save_node_registry(user_id: str, registry: dict):
    path = get_registry_path(user_id)
    save_json_file(path, registry)

def update_node_registry(registry: dict, node_id: str, graph_id: str):
    now = datetime.utcnow().isoformat()
    if node_id not in registry:
        registry[node_id] = {
            "name": node_id.capitalize(),
            "graphs": [graph_id],
            "created_at": now,
            "updated_at": now
        }
    else:
        if graph_id not in registry[node_id]["graphs"]:
            registry[node_id]["graphs"].append(graph_id)
        registry[node_id]["updated_at"] = now


def create_node_if_missing(user_id: str, node_id: str, name: str = None):
    node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")

    if node_path.exists():
        return

    # Ensure parent directory exists
    node_path.parent.mkdir(parents=True, exist_ok=True)

    # Write minimal node
    node_data = {
        "id": node_id,
        "name": name or node_id.capitalize(),
        "description": "",
        "attributes": [],
        "relations": []
    }
    save_json_file(node_path, node_data)


