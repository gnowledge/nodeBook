import os
from fastapi import HTTPException
from .utils import render_description_md, load_json_file, save_json_file
from collections import OrderedDict
import json
from pathlib import Path

NODE_KEY_ORDER = [
    "id",
    "name",
    "role",
    "qualifier",
    "description",
    "attributes",
    "relations"
]

def ordered_node_dict(node: dict) -> OrderedDict:
    ordered = OrderedDict()
    for key in NODE_KEY_ORDER:
        if key in node:
            ordered[key] = node[key]
    for key in node:
        if key not in ordered:
            ordered[key] = node[key]
    return ordered

def sort_attributes(attrs: list[dict]) -> list[dict]:
    return sorted(attrs, key=lambda x: x.get("name", ""))

def sort_relations(rels: list[dict]) -> list[dict]:
    return sorted(rels, key=lambda x: (x.get("name", ""), x.get("object", "")))


def node_path(user_id: str, graph_id: str, node_id: str) -> str:
    # Always use the JSON node file in the user nodes directory
    return os.path.join("graph_data", "users", user_id, "nodes", f"{node_id}.json")

def ensure_basic_morph(node_data: dict, node_id: str) -> dict:
    """
    Ensure a node has a basic morph. If not, create one and set it as the active neighborhood.
    """
    if "morphs" not in node_data:
        node_data["morphs"] = []
    
    # Check if basic morph exists
    basic_morph_exists = any(morph.get("name") == "basic" for morph in node_data["morphs"])
    
    if not basic_morph_exists:
        # Create basic morph
        basic_morph = {
            "morph_id": f"basic_{node_id}",
            "node_id": node_id,
            "name": "basic",
            "relationNode_ids": [],
            "attributeNode_ids": []
        }
        node_data["morphs"].append(basic_morph)
        # Set nbh to basic morph if not already set
        if not node_data.get("nbh"):
            node_data["nbh"] = basic_morph["morph_id"]
    
    return node_data

def load_node_with_basic_morph(user_id: str, node_id: str) -> dict:
    """
    Load a node and ensure it has a basic morph for the new architecture.
    """
    node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
    if not node_path.exists():
        raise HTTPException(status_code=404, detail="Node not found")
    
    with open(node_path, 'r') as f:
        node_data = json.load(f)
    
    # Ensure the node has a basic morph for the new architecture
    node_data = ensure_basic_morph(node_data, node_id)
    
    return node_data

def load_node(user_id: str, graph_id: str, node_id: str) -> dict:
    """
    Load a node and ensure it has a basic morph for the new architecture.
    Backward compatibility function.
    """
    return load_node_with_basic_morph(user_id, node_id)

def save_node(user_id: str, graph_id: str, node_id: str, data: dict):
    path = Path(node_path(user_id, graph_id, node_id))
    os.makedirs(path.parent, exist_ok=True)
    save_json_file(path, data)

def safe_node_summary(user_id: str, graph_id: str, node_id: str) -> dict | None:
    try:
        node = load_node_with_basic_morph(user_id, node_id)
    except Exception:
        return None
    if not node or not isinstance(node, dict):
        return None
    node_id = node.get("id") or node.get("name") or node_id
    label = node.get("name") or node.get("label") or node_id
    qualifier = node.get("qualifier")
    description = node.get("description", "")
    return {
        "id": node_id,
        "label": label,
        "qualifier": qualifier,
        "description": description,
        "description_html": render_description_md(description)
    }

def safe_edge_summaries(node_id: str, node_data: dict) -> list:
    edges = []
    relations = node_data.get("relations", [])
    for rel in relations:
        if not isinstance(rel, dict):
            continue
        rel_type = rel.get("name") or rel.get("type")
        target = rel.get("target")
        if not rel_type or not target:
            continue
        edge_id = f"{node_id}-{rel_type}->{target}"
        edges.append({
            "data": {
                "id": edge_id,
                "source": node_id,
                "target": target,
                "label": rel_type
            }
        })
    return edges


