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
# ---------- API Endpoints for Attributes and Relations ----------


@router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
def create_attribute(user_id: str, graph_id: str, attr: Attribute):
    global_path = os.path.join("graph_data", "global")
    attr_types = load_schema(global_path, "attribute_types.json")
    attr_type_map = {a["name"]: a for a in attr_types}
    if attr.name not in attr_type_map:
        raise HTTPException(status_code=400, detail="Invalid attribute name")
    attr_type = attr_type_map[attr.name]
    data = load_node(user_id, attr.node_id)
    node_attrs = data.get("attributes", [])
    if any(a["name"] == attr.name for a in node_attrs):
        raise HTTPException(status_code=400, detail="Attribute already exists")
    # Support multi-valued attributes
    is_multiple = attr_type.get("multiple", False)
    value = attr.value
    if is_multiple:
        if not isinstance(value, list):
            value = [value] if value is not None else []
    entry = {
        "id": make_attribute_id(attr.node_id, attr.name, attr.adverb or "", attr.modality or ""),
        "name": attr.name,
        "value": value,
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
        "value": value,
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
    global_path = os.path.join("graph_data", "global")
    attr_types = load_schema(global_path, "attribute_types.json")
    attr_type_map = {a["name"]: a for a in attr_types}
    if attr.name not in attr_type_map:
        raise HTTPException(status_code=400, detail="Invalid attribute name")
    attr_type = attr_type_map[attr.name]
    is_multiple = attr_type.get("multiple", False)
    value = attr.value
    if is_multiple:
        if not isinstance(value, list):
            value = [value] if value is not None else []
    data = load_node(user_id, node_id)
    attrs = data.get("attributes", [])
    found = False
    for a in attrs:
        if a["name"] == attr_name:
            a["name"] = attr.name
            a["value"] = value
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
    attr_id = make_attribute_id(node_id, attr.name, attr.adverb or "", attr.modality or "")
    if attr_id in registry:
        registry[attr_id].update({
            "name": attr.name,
            "value": value,
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
    attr_id = make_attribute_id(node_id, attr_name, "", "")
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
        "id": make_relation_id(rel.source, rel.name, rel.target, rel.adverb or "", rel.modality or ""),
        "type": rel.name,
        "source": rel.source,  # <-- Ensure source is included
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
    old_id = None
    for r in rels:
        if r["type"] == name and r["target"] == target:
            old_id = r.get("id") or make_relation_id(source, name, target, r.get("adverb", "") or "", r.get("modality", "") or "")
            r["type"] = rel.name
            r["source"] = rel.source  # always include source
            r["target"] = rel.target
            r["adverb"] = rel.adverb
            r["modality"] = rel.modality
            r["id"] = make_relation_id(rel.source, rel.name, rel.target, rel.adverb or "", rel.modality or "")
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Relation not found")
    save_node(user_id, source, data)
    # Update relation registry
    reg_path = relation_registry_path(user_id)
    registry = load_registry(reg_path)
    new_id = make_relation_id(rel.source, rel.name, rel.target, rel.adverb or "", rel.modality or "")
    # Remove old registry entry if id changed
    if old_id and old_id != new_id and old_id in registry:
        del registry[old_id]
    registry[new_id] = {
        "source": rel.source,
        "type": rel.name,
        "target": rel.target,
        "adverb": rel.adverb,
        "modality": rel.modality,
        "created_at": registry.get(new_id, {}).get("created_at") or __import__('datetime').datetime.utcnow().isoformat(),
        "updated_at": __import__('datetime').datetime.utcnow().isoformat()
    }
    save_registry(reg_path, registry)
    # --- Compose the graph after relation update ---
    from backend.core.compose import compose_graph
    from backend.core.registry import load_node_registry
    node_registry = load_node_registry(user_id)
    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
    compose_graph(user_id, graph_id, node_ids)
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
    rel_id = make_relation_id(source, name, target, "", "")
    if rel_id in registry:
        del registry[rel_id]
        save_registry(reg_path, registry)
    return {"status": "relation deleted"}

# ---------- AttributeNode Routes with Registry ----------

@router.get("/users/{user_id}/attributeNodes/{id}")
def get_attribute_node(user_id: str, id: str):
    path = f"graph_data/users/{user_id}/attributeNodes/{id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="AttributeNode not found")
    with open(path) as f:
        return json.load(f)

@router.post("/users/{user_id}/attributeNodes/")
def create_attribute_node(user_id: str, attr: AttributeNode):
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

    return {"status": "AttributeNode created and registered"}

@router.put("/users/{user_id}/attributeNodes/{id}")
def update_attribute_node(user_id: str, id: str, attr: AttributeNode):
    attr.id = make_attribute_id(attr.source_id, attr.name, attr.adverb or "", attr.modality or "")
    attr_path = f"graph_data/users/{user_id}/attributeNodes/{id}.json"
    reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
    if not os.path.exists(attr_path):
        raise HTTPException(status_code=404, detail="AttributeNode not found")
    with open(attr_path, "w") as f:
        json.dump(attr.dict(), f, indent=2)

    registry = load_registry(reg_path)
    registry[attr.id] = attr.dict()
    save_registry(reg_path, registry)

    return {"status": "AttributeNode updated and registry synced"}

@router.delete("/users/{user_id}/attributeNodes/{id}")
def delete_attribute_node(user_id: str, id: str):
    attr_path = f"graph_data/users/{user_id}/attributeNodes/{id}.json"
    reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
    if os.path.exists(attr_path):
        os.remove(attr_path)

        registry = load_registry(reg_path)
        registry = remove_registry_entry(registry, id)
        save_registry(reg_path, registry)

        return {"status": "AttributeNode deleted and registry updated"}
    raise HTTPException(status_code=404, detail="AttributeNode not found")

@router.get("/users/{user_id}/attributeNodes")
def list_attribute_nodes(user_id: str):
    reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
    return load_registry(reg_path)

@router.get("/users/{user_id}/relationNodes/{id}")
def get_relation_node(user_id: str, id: str):
    path = f"graph_data/users/{user_id}/relationNodes/{id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="RelationNode not found")
    with open(path) as f:
        return json.load(f)

@router.post("/users/{user_id}/relationNodes/")
def create_relation_node(user_id: str, rel: RelationNode):
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

@router.put("/users/{user_id}/relationNodes/{id}")
def update_relation_node(user_id: str, id: str, rel: RelationNode):
    rel.id = make_relation_id(rel.source_id, rel.name, rel.target_id, rel.adverb or "", rel.modality or "")
    rel_path = f"graph_data/users/{user_id}/relationNodes/{id}.json"
    reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    if not os.path.exists(rel_path):
        raise HTTPException(status_code=404, detail="RelationNode not found")
    with open(rel_path, "w") as f:
        json.dump(rel.dict(), f, indent=2)

    registry = load_registry(reg_path)
    registry[rel.id] = rel.dict()
    save_registry(reg_path, registry)

    return {"status": "RelationNode updated and registry synced"}

@router.delete("/users/{user_id}/relationNodes/{id}")
def delete_relation_node(user_id: str, id: str):
    rel_path = f"graph_data/users/{user_id}/relationNodes/{id}.json"
    reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    if os.path.exists(rel_path):
        os.remove(rel_path)

        registry = load_registry(reg_path)
        if id in registry:
            del registry[id]
            save_registry(reg_path, registry)

        return {"status": "RelationNode deleted and registry updated"}
    raise HTTPException(status_code=404, detail="RelationNode not found")

@router.get("/users/{user_id}/relationNodes")
def list_relation_nodes(user_id: str):
    reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    return load_registry(reg_path)
