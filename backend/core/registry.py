import json
from pathlib import Path
from datetime import datetime
from backend.core.utils import normalize_id, save_json_file, load_json_file

try:
    from backend.config import get_data_root
except ImportError:
    from config import get_data_root

def get_registry_path(user_id: str) -> Path:
    return get_data_root() / "users" / user_id / "node_registry.json"

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
    from core.cnl_parser import parse_node_title
    node_path = get_data_root() / "users" / user_id / "nodes" / f"{node_id}.json"

    if node_path.exists():
        return

    # Ensure parent directory exists
    node_path.parent.mkdir(parents=True, exist_ok=True)

    # Use parse_node_title to extract clean fields
    title_info = parse_node_title(name or node_id)
    node_data = {
        "id": title_info["id"],
        "name": title_info["name"],
        "base": title_info["base"],
        "quantifier": title_info.get("quantifier"),
        "qualifier": title_info.get("qualifier"),
        "description": "",
        "attributes": [],
        "relations": []
    }
    save_json_file(node_path, node_data)

def relation_registry_path(user_id: str) -> Path:
    return get_data_root() / "users" / user_id / "relation_registry.json"

def attribute_registry_path(user_id: str) -> Path:
    return get_data_root() / "users" / user_id / "attribute_registry.json"

def load_registry(path: Path) -> dict:
    if path.exists():
        return load_json_file(path)
    else:
        return {}

def save_registry(path: Path, registry: dict):
    save_json_file(path, registry)

def make_relation_id(source: str, type_: str, target: str, adverb: str = "", modality: str = "") -> str:
    parts = [source, adverb, type_, target, modality]
    return '::'.join([p for p in parts if p])

def make_attribute_id(node_id: str, name: str, adverb: str = "", modality: str = "") -> str:
    parts = [node_id, adverb, name, modality]
    return '::'.join([p for p in parts if p])

def make_polynode_id(quantifier: str = "", adverb: str = "", morph_name: str = "", base_name: str = "") -> str:
    parts = [quantifier, adverb, morph_name, base_name]
    return '_'.join([p for p in parts if p])

def make_morph_id(name: str, node_id: str) -> str:
    return f"{name}_{node_id}"


