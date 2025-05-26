import os
import yaml
from fastapi import HTTPException
from core.utils import render_description_md

def node_path(user_id: str, graph_id: str, node_id: str) -> str:
    return os.path.join("graph_data", user_id, graph_id, f"{node_id}.yaml")

def load_node(user_id: str, graph_id: str, node_id: str) -> dict:
    path = node_path(user_id, graph_id, node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def save_node(user_id: str, graph_id: str, node_id: str, data: dict):
    path = node_path(user_id, graph_id, node_id)
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)


def safe_node_summary(user_id: str, graph_id: str, file: str) -> dict | None:
    node_id = file[:-5]
    data = load_node(user_id, graph_id, node_id)
    if not data or "node" not in data or not isinstance(data["node"], dict):
        return None

    node = data["node"]
    node_id = node.get("id") or node.get("name") or file[:-5]
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


