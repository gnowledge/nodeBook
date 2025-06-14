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
from backend.core.models import Attribute, Relation
from backend.routes.nodes import create_node
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

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
def create_attribute(user_id: str, graph_id: str, attr: Attribute):
    global_path = os.path.join("graph_data", "global")
    attr_types = load_schema(global_path, "attribute_types.json")
    attr_type_map = {a["name"]: a for a in attr_types}
    if attr.name not in attr_type_map:
        raise HTTPException(status_code=400, detail="Invalid attribute name")
    data = load_node(user_id, attr.node_id)
    node_attrs = data.get("attributes", [])
    if any(a["name"] == attr.name for a in node_attrs):
        raise HTTPException(status_code=400, detail="Attribute already exists")
    entry = {
        "id": make_attribute_id(attr.node_id, attr.name),
        "name": attr.name,
        "value": attr.value,
        "unit": attr.unit,
        "adverb": attr.adverb,
        "modality": attr.modality
    }
    data.setdefault("attributes", []).append(entry)
    save_node(user_id, attr.node_id, data)
    # Update attribute registry
    reg_path = attribute_registry_path(user_id)
    registry = load_registry(reg_path)
    registry[entry["id"]] = {
        "node_id": attr.node_id,
        "name": attr.name,
        "value": attr.value,
        "unit": attr.unit,
        "adverb": attr.adverb,
        "modality": attr.modality,
        "created_at": registry.get(entry["id"], {}).get("created_at") or __import__('datetime').datetime.utcnow().isoformat(),
        "updated_at": __import__('datetime').datetime.utcnow().isoformat()
    }
    save_registry(reg_path, registry)
    return {"status": "attribute added"}

@router.put("/users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}")
def update_attribute(user_id: str, graph_id: str, node_id: str, attr_name: str, attr: Attribute):
    data = load_node(user_id, node_id)
    attrs = data.get("attributes", [])
    found = False
    for a in attrs:
        if a["name"] == attr_name:
            a["name"] = attr.name
            a["value"] = attr.value
            a["unit"] = attr.unit
            a["adverb"] = attr.adverb
            a["modality"] = attr.modality
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Attribute not found")
    save_node(user_id, node_id, data)
    # Update attribute registry
    reg_path = attribute_registry_path(user_id)
    registry = load_registry(reg_path)
    attr_id = make_attribute_id(node_id, attr.name)
    if attr_id in registry:
        registry[attr_id].update({
            "name": attr.name,
            "value": attr.value,
            "unit": attr.unit,
            "adverb": attr.adverb,
            "modality": attr.modality,
            "updated_at": __import__('datetime').datetime.utcnow().isoformat()
        })
        save_registry(reg_path, registry)
    return {"status": "attribute updated"}

@router.delete("/users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}")
def delete_attribute(user_id: str, graph_id: str, node_id: str, attr_name: str):
    data = load_node(user_id, node_id)
    attrs = data.get("attributes", [])
    new_attrs = [a for a in attrs if a["name"] != attr_name]
    if len(new_attrs) == len(attrs):
        raise HTTPException(status_code=404, detail="Attribute not found")
    data["attributes"] = new_attrs
    save_node(user_id, node_id, data)
    # Remove from attribute registry
    reg_path = attribute_registry_path(user_id)
    registry = load_registry(reg_path)
    attr_id = make_attribute_id(node_id, attr_name)
    if attr_id in registry:
        del registry[attr_id]
        save_registry(reg_path, registry)
    return {"status": "attribute deleted"}

@router.post("/users/{user_id}/graphs/{graph_id}/relation/create")
def create_relation(user_id: str, graph_id: str, rel: Relation):
    global_path = os.path.join("graph_data", "global")
    rel_types = load_schema(global_path, "relation_types.json")
    rel_type_map = {r["name"]: r for r in rel_types}
    if rel.name not in rel_type_map:
        raise HTTPException(status_code=400, detail="Invalid relation type")
    # Ensure source node exists using create_node
    try:
        data = load_node(user_id, rel.source)
    except HTTPException:
        create_node(user_id, graph_id, type('Node', (), {'name': rel.source, 'attributes': [], 'relations': [], 'qualifier': None, 'role': None, 'description': None, 'id': rel.source})())
        data = load_node(user_id, rel.source)
    # Ensure target node exists using create_node
    try:
        _ = load_node(user_id, rel.target)
    except HTTPException:
        create_node(user_id, graph_id, type('Node', (), {'name': rel.target, 'attributes': [], 'relations': [], 'qualifier': None, 'role': None, 'description': None, 'id': rel.target})())
    data = load_node(user_id, rel.source)  # reload in case just created
    # Accept both 'type' and 'name' for legacy compatibility
    if any((r.get("type") or r.get("name")) == rel.name and r["target"] == rel.target for r in data.get("relations", [])):
        raise HTTPException(status_code=400, detail="Relation already exists")
    entry = {
        "id": make_relation_id(rel.source, rel.name, rel.target),
        "type": rel.name,
        "target": rel.target,
        "adverb": rel.adverb,
        "modality": rel.modality
    }
    data.setdefault("relations", []).append(entry)
    save_node(user_id, rel.source, data)
    # Update relation registry
    reg_path = relation_registry_path(user_id)
    registry = load_registry(reg_path)
    registry[entry["id"]] = {
        "source": rel.source,
        "type": rel.name,
        "target": rel.target,
        "adverb": rel.adverb,
        "modality": rel.modality,
        "created_at": registry.get(entry["id"], {}).get("created_at") or __import__('datetime').datetime.utcnow().isoformat(),
        "updated_at": __import__('datetime').datetime.utcnow().isoformat()
    }
    save_registry(reg_path, registry)
    # --- Compose the graph after relation creation ---
    from backend.core.compose import compose_graph
    # Collect all node ids for this graph (from registry or node files)
    from backend.core.registry import load_node_registry
    node_registry = load_node_registry(user_id)
    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
    compose_graph(user_id, graph_id, node_ids)
    inverse = rel_type_map[rel.name].get("inverse_name")
    if inverse:
        target_data = load_node(user_id, rel.target)
        if not any(r["type"] == inverse and r["target"] == rel.source for r in target_data.get("relations", [])):
            target_data.setdefault("relations", []).append({"type": inverse, "target": rel.source})
            save_node(user_id, rel.target, target_data)
    return {"status": "relation and inverse added" if inverse else "relation added"}

@router.put("/users/{user_id}/graphs/{graph_id}/relation/update/{source}/{name}/{target}")
def update_relation(user_id: str, graph_id: str, source: str, name: str, target: str, rel: Relation):
    # Ensure new target node exists if changed using create_node
    try:
        _ = load_node(user_id, rel.target)
    except HTTPException:
        create_node(user_id, graph_id, type('Node', (), {'name': rel.target, 'attributes': [], 'relations': [], 'qualifier': None, 'role': None, 'description': None, 'id': rel.target})())
    data = load_node(user_id, source)
    rels = data.get("relations", [])
    found = False
    for r in rels:
        if r["type"] == name and r["target"] == target:
            r["type"] = rel.name
            r["target"] = rel.target
            r["adverb"] = rel.adverb
            r["modality"] = rel.modality
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Relation not found")
    save_node(user_id, source, data)
    # Update relation registry
    reg_path = relation_registry_path(user_id)
    registry = load_registry(reg_path)
    rel_id = make_relation_id(source, rel.name, rel.target)
    if rel_id in registry:
        registry[rel_id].update({
            "type": rel.name,
            "target": rel.target,
            "adverb": rel.adverb,
            "modality": rel.modality,
            "updated_at": __import__('datetime').datetime.utcnow().isoformat()
        })
        save_registry(reg_path, registry)
    return {"status": "relation updated"}

@router.delete("/users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}")
def delete_relation(user_id: str, graph_id: str, source: str, name: str, target: str):
    data = load_node(user_id, source)
    rels = data.get("relations", [])
    new_rels = [r for r in rels if not (r["type"] == name and r["target"] == target)]
    if len(new_rels) == len(rels):
        raise HTTPException(status_code=404, detail="Relation not found")
    data["relations"] = new_rels
    save_node(user_id, source, data)
    # Remove from relation registry
    reg_path = relation_registry_path(user_id)
    registry = load_registry(reg_path)
    rel_id = make_relation_id(source, name, target)
    if rel_id in registry:
        del registry[rel_id]
        save_registry(reg_path, registry)
    return {"status": "relation deleted"}
