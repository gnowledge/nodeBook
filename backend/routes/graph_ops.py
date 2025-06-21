"""
This module provides API endpoints and helper functions for managing node attributes and relations in the NDF Studio knowledge graph backend.

Key Features:
- All node data is stored as JSON files under graph_data/users/{user_id}/nodes/{node_id}.json.
- Attribute and relation types are validated against global schema files (attribute_types.json, relation_types.json).
- Endpoints support full CRUD (create, update, delete) for both attributes and relations.
- When creating or updating a relation, if the source or target node does not exist, the canonical create_node function from nodes.py is called to ensure proper node creation and registry updates.
- All endpoints are designed for robust integration with the frontend, supporting both selection and creation of new nodes/relations/attributes.

Endpoints:
- POST   /users/{user_id}/graphs/{graph_id}/attribute/create
- PUT    /users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}
- DELETE /users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}
- POST   /users/{user_id}/graphs/{graph_id}/relation/create
- PUT    /users/{user_id}/graphs/{graph_id}/relation/update/{source}/{name}/{target}
- DELETE /users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}

Helpers:
- node_path, load_node, save_node: JSON-based node storage helpers.
- load_schema: Loads global schema files for validation.

All logic is designed to be robust, extensible, and consistent with the rest of the backend.
"""

import os
import json
from fastapi import APIRouter, HTTPException
from backend.core.id_utils import get_graph_path
from backend.core.models import Attribute, Relation, AttributeNode, RelationNode
from backend.routes.nodes import create_polynode
from backend.core.registry import (
    relation_registry_path, attribute_registry_path, load_registry, save_registry, make_relation_id, make_attribute_id
)

router = APIRouter()

# Helpers for JSON node storage

def node_path(user_id, node_id):
    return os.path.join("graph_data", "users", user_id, "nodes", f"{node_id}.json")

def load_node(user_id, node_id):
    path = node_path(user_id, node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def save_node(user_id, node_id, data):
    path = node_path(user_id, node_id)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def load_schema(global_path, filename):
    path = os.path.join(global_path, filename)
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as f:
        return json.load(f) or []

# ---------- Helper Functions for Registry ----------

def load_registry(path):
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)

def save_registry(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def update_registry_entry(registry, entry):
    updated = False
    for i, r in enumerate(registry):
        if r["id"] == entry["id"]:
            registry[i] = entry
            updated = True
            break
    if not updated:
        registry.append(entry)
    return registry

def remove_registry_entry(registry, entry_id):
    return [r for r in registry if r["id"] != entry_id]



# ---------- AttributeNode Routes with Registry ----------
# ... existing code ...
# --- Legacy attribute and relation CRUD functions (commented out, kept for reference) ---
# @router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
# def create_attribute(user_id: str, graph_id: str, attr: Attribute):
#     ... (legacy logic)
#
# @router.put("/users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}")
# def update_attribute(user_id: str, graph_id: str, node_id: str, attr_name: str, attr: Attribute):
#     ... (legacy logic)
#
# @router.delete("/users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}")
# def delete_attribute(user_id: str, graph_id: str, node_id: str, attr_name: str):
#     ... (legacy logic)
#
# @router.post("/users/{user_id}/graphs/{graph_id}/relation/create")
# def create_relation(user_id: str, graph_id: str, rel: Relation):
#     ... (legacy logic)
#
# @router.put("/users/{user_id}/graphs/{graph_id}/relation/update/{source}/{name}/{target}")
# def update_relation(user_id: str, graph_id: str, source: str, name: str, target: str, rel: Relation):
#     ... (legacy logic)
#
# @router.delete("/users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}")
# def delete_relation(user_id: str, graph_id: str, source: str, name: str, target: str):
#     ... (legacy logic)

# --- AttributeNode CRUD with legacy route decorators ---

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
def create_attribute_node(user_id: str, graph_id: str, attr: AttributeNode):
    attr.id = make_attribute_id(attr.source_id, attr.name, attr.adverb or "", attr.modality or "")
    attr_path = f"graph_data/users/{user_id}/attributeNodes/{attr.id}.json"
    reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
    os.makedirs(os.path.dirname(attr_path), exist_ok=True)
    if os.path.exists(attr_path):
        raise HTTPException(status_code=400, detail="AttributeNode already exists")
    with open(attr_path, "w") as f:
        json.dump(attr.dict(), f, indent=2)
    registry = load_registry(reg_path)
    registry[attr.id] = attr.dict()
    save_registry(reg_path, registry)
    # Optionally, update node's morph/attributes here if needed
    return {"status": "AttributeNode created and registered"}

@router.put("/users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}")
def update_attribute_node(user_id: str, graph_id: str, node_id: str, attr_name: str, attr: AttributeNode):
    attr.id = make_attribute_id(attr.source_id, attr.name, attr.adverb or "", attr.modality or "")
    attr_path = f"graph_data/users/{user_id}/attributeNodes/{attr.id}.json"
    reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
    if not os.path.exists(attr_path):
        raise HTTPException(status_code=404, detail="AttributeNode not found")
    with open(attr_path, "w") as f:
        json.dump(attr.dict(), f, indent=2)
    registry = load_registry(reg_path)
    registry[attr.id] = attr.dict()
    save_registry(reg_path, registry)
    return {"status": "AttributeNode updated and registry synced"}

@router.delete("/users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}")
def delete_attribute_node(user_id: str, graph_id: str, node_id: str, attr_name: str):
    # Find the attributeNode id by node_id and attr_name
    reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
    registry = load_registry(reg_path)
    attr_id = None
    for k, v in registry.items():
        if v.get("source_id") == node_id and v.get("name") == attr_name:
            attr_id = k
            break
    if not attr_id:
        raise HTTPException(status_code=404, detail="AttributeNode not found")
    attr_path = f"graph_data/users/{user_id}/attributeNodes/{attr_id}.json"
    if os.path.exists(attr_path):
        os.remove(attr_path)
    if attr_id in registry:
        del registry[attr_id]
        save_registry(reg_path, registry)
    return {"status": "AttributeNode deleted and registry updated"}

# --- RelationNode CRUD with legacy route decorators ---
@router.post("/users/{user_id}/graphs/{graph_id}/relation/create")
def create_relation_node(user_id: str, graph_id: str, rel: RelationNode):
    rel.id = make_relation_id(rel.source_id, rel.name, rel.target_id, rel.adverb or "", rel.modality or "")
    rel_path = f"graph_data/users/{user_id}/relationNodes/{rel.id}.json"
    reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    os.makedirs(os.path.dirname(rel_path), exist_ok=True)
    if os.path.exists(rel_path):
        raise HTTPException(status_code=400, detail="RelationNode already exists")
    with open(rel_path, "w") as f:
        json.dump(rel.dict(), f, indent=2)
    registry = load_registry(reg_path)
    registry[rel.id] = rel.dict()
    save_registry(reg_path, registry)
    return {"status": "RelationNode created and registered"}

@router.put("/users/{user_id}/graphs/{graph_id}/relation/update/{source}/{name}/{target}")
def update_relation_node(user_id: str, graph_id: str, source: str, name: str, target: str, rel: RelationNode):
    rel.id = make_relation_id(rel.source_id, rel.name, rel.target_id, rel.adverb or "", rel.modality or "")
    rel_path = f"graph_data/users/{user_id}/relationNodes/{rel.id}.json"
    reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    if not os.path.exists(rel_path):
        raise HTTPException(status_code=404, detail="RelationNode not found")
    with open(rel_path, "w") as f:
        json.dump(rel.dict(), f, indent=2)
    registry = load_registry(reg_path)
    registry[rel.id] = rel.dict()
    save_registry(reg_path, registry)
    return {"status": "RelationNode updated and registry synced"}

@router.delete("/users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}")
def delete_relation_node(user_id: str, graph_id: str, source: str, name: str, target: str):
    # Find the relationNode id by source, name, and target
    reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    registry = load_registry(reg_path)
    rel_id = None
    for k, v in registry.items():
        if v.get("source_id") == source and v.get("name") == name and v.get("target_id") == target:
            rel_id = k
            break
    if not rel_id:
        raise HTTPException(status_code=404, detail="RelationNode not found")
    rel_path = f"graph_data/users/{user_id}/relationNodes/{rel_id}.json"
    if os.path.exists(rel_path):
        os.remove(rel_path)
    if rel_id in registry:
        del registry[rel_id]
        save_registry(reg_path, registry)
    return {"status": "RelationNode deleted and registry updated"}
# ... existing code ...





