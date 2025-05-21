# routes/graph_ops.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os, yaml

router = APIRouter()
GRAPH_DATA_PATH = "graph_data"
SCHEMA_PATH = "schema"

class Attribute(BaseModel):
    node_id: str
    name: str
    value: str

class Relation(BaseModel):
    node_id: str
    type: str
    target: str
    role: Optional[str] = None  # class or individual

class Node(BaseModel):
    id: str
    label: str
    role: Optional[str] = None  # top-level role field
    # attributes and relations omitted here but should be handled in routes/nodes.py

# Helpers

def node_path(node_id):
    return os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")

def load_node(node_id):
    path = node_path(node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def save_node(node_id, data):
    path = node_path(node_id)
    with open(path, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False)

def load_schema(filename):
    path = os.path.join(SCHEMA_PATH, filename)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f) or []



def create_attribute(attr: Attribute):
    attr_types = load_schema("attribute_types.yaml")
    attr_type_map = {a["name"]: a for a in attr_types}
    if attr.name not in attr_type_map:
        raise HTTPException(status_code=400, detail="Invalid attribute name")

    data = load_node(attr.node_id)
    node_attrs = data["node"].get("attributes", [])
    if any(a["name"] == attr.name for a in node_attrs):
        raise HTTPException(status_code=400, detail="Attribute already exists")

    data["node"].setdefault("attributes", []).append({"name": attr.name, "value": attr.value})
    save_node(attr.node_id, data)
    return {"status": "attribute added"}

@router.post("/relation/create")
def create_relation(rel: Relation):
    rel_types = load_schema("relation_types.yaml")
    rel_type_map = {r["name"]: r for r in rel_types}

    if rel.type not in rel_type_map:
        raise HTTPException(status_code=400, detail="Invalid relation type")

    data = load_node(rel.node_id)
    if any(r["type"] == rel.type and r["target"] == rel.target for r in data.get("relations", [])):
        raise HTTPException(status_code=400, detail="Relation already exists")

    # Add forward relation
    data.setdefault("relations", []).append({"type": rel.type, "target": rel.target})
    save_node(rel.node_id, data)

    # Auto-create inverse if defined
    inverse = rel_type_map[rel.type].get("inverse_name")
    target_data = None
    if inverse:
        try:
            target_data = load_node(rel.target)
        except HTTPException:
            target_data = {"node": {"id": rel.target, "label": rel.target, "attributes": []}, "relations": []}
        if not any(r["type"] == inverse and r["target"] == rel.node_id for r in target_data.get("relations", [])):
            target_data.setdefault("relations", []).append({"type": inverse, "target": rel.node_id})
            save_node(rel.target, target_data)

    return {"status": "relation and inverse added" if inverse else "relation added"}

@router.delete("/attribute/{node_id}/{attr_name}")
def delete_attribute(node_id: str, attr_name: str):
    data = load_node(node_id)
    original = data["node"].get("attributes", [])
    filtered = [a for a in original if a["name"] != attr_name]
    if len(filtered) == len(original):
        raise HTTPException(status_code=404, detail="Attribute not found")
    data["node"]["attributes"] = filtered
    save_node(node_id, data)
    return {"status": "attribute deleted"}

@router.delete("/relation/{node_id}/{target}")
def delete_relation(node_id: str, target: str, type: Optional[str] = None):
    rel_types = load_schema("relation_types.yaml")
    rel_type_map = {r["name"]: r for r in rel_types}

    data = load_node(node_id)
    original = data.get("relations", [])
    if type:
        filtered = [r for r in original if not (r["target"] == target and r["type"] == type)]
    else:
        filtered = [r for r in original if r["target"] != target]
    if len(filtered) == len(original):
        raise HTTPException(status_code=404, detail="Relation not found")
    data["relations"] = filtered
    save_node(node_id, data)

    # Also remove inverse if defined
    if type and type in rel_type_map:
        inverse = rel_type_map[type].get("inverse_name")
        if inverse:
            try:
                target_data = load_node(target)
                target_rels = target_data.get("relations", [])
                target_filtered = [r for r in target_rels if not (r["type"] == inverse and r["target"] == node_id)]
                if len(target_filtered) < len(target_rels):
                    target_data["relations"] = target_filtered
                    save_node(target, target_data)
            except HTTPException:
                pass

    return {"status": "relation and inverse deleted" if type else "relation deleted"}
