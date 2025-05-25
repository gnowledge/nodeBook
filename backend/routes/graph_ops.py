from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Union
import os, yaml
from core.id_utils import get_graph_path

router = APIRouter()

class Attribute(BaseModel):
    node_id: str
    name: str
    value: Union[str, float, int, bool]
    unit: Optional[str] = None
    quantifier: Optional[str] = None
    modality: Optional[str] = None

class Relation(BaseModel):
    node_id: str
    name: str
    target: str
    role: Optional[str] = None

# Helpers

def node_path(graph_path, node_id):
    return os.path.join(graph_path, f"{node_id}.yaml")

def load_node(graph_path, node_id):
    path = node_path(graph_path, node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def save_node(graph_path, node_id, data):
    path = node_path(graph_path, node_id)
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False)

def load_schema(global_path, filename):
    path = os.path.join(global_path, filename)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or []

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
def create_attribute(user_id: str, graph_id: str, attr: Attribute):
    graph_path = get_graph_path(user_id, graph_id)
    global_path = os.path.join("graph_data", "global")

    attr_types = load_schema(global_path, "attribute_types.yaml")
    attr_type_map = {a["name"]: a for a in attr_types}

    if attr.name not in attr_type_map:
        raise HTTPException(status_code=400, detail="Invalid attribute name")

    data = load_node(graph_path, attr.node_id)
    node_attrs = data["node"].get("attributes", [])

    if any(a["name"] == attr.name for a in node_attrs):
        raise HTTPException(status_code=400, detail="Attribute already exists")

    entry = {
        "name": attr.name,
        "value": attr.value,
        "unit": attr.unit,
        "quantifier": attr.quantifier,
        "modality": attr.modality
    }

    data["node"].setdefault("attributes", []).append(entry)
    save_node(graph_path, attr.node_id, data)

    return {"status": "attribute added"}

@router.post("/users/{user_id}/graphs/{graph_id}/relation/create")
def create_relation(user_id: str, graph_id: str, rel: Relation):
    graph_path = get_graph_path(user_id, graph_id)
    global_path = os.path.join("graph_data", "global")

    rel_types = load_schema(global_path, "relation_types.yaml")
    rel_type_map = {r["name"]: r for r in rel_types}

    if rel.name not in rel_type_map:
        raise HTTPException(status_code=400, detail="Invalid relation type")

    try:
        data = load_node(graph_path, rel.node_id)
    except HTTPException:
        data = {"node": {"name": rel.node_id, "label": rel.node_id, "attributes": []}, "relations": []}

    if any(r["type"] == rel.name and r["target"] == rel.target for r in data.get("relations", [])):
        raise HTTPException(status_code=400, detail="Relation already exists")

    data.setdefault("relations", []).append({"type": rel.name, "target": rel.target})
    save_node(graph_path, rel.node_id, data)

    inverse = rel_type_map[rel.name].get("inverse_name")
    if inverse:
        try:
            target_data = load_node(graph_path, rel.target)
        except HTTPException:
            target_data = {"node": {"name": rel.target, "label": rel.target, "attributes": []}, "relations": []}

        if not any(r["type"] == inverse and r["target"] == rel.node_id for r in target_data.get("relations", [])):
            target_data.setdefault("relations", []).append({"type": inverse, "target": rel.node_id})
            save_node(graph_path, rel.target, target_data)

    return {"status": "relation and inverse added" if inverse else "relation added"}
