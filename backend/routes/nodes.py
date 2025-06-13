from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
from backend.core.node_ops import load_node, save_node, node_path, safe_node_summary
from backend.core.id_utils import normalize_id, get_graph_path, get_user_id
from backend.summary_queue_singleton import init_summary_queue

router = APIRouter()

class Attribute(BaseModel):
    name: str
    value: Optional[str] = None
    quantifier: Optional[str] = None
    modality: Optional[str] = None

class Relation(BaseModel):
    name: str
    target: str
    subject_quantifier: Optional[str] = None
    object_quantifier: Optional[str] = None
    modality: Optional[str] = None

class Node(BaseModel):
    id: Optional[str] = None
    name: str
    base_name: Optional[str] = None
    qualifier: Optional[str] = None  # <-- allow any string, not Literal
    role: Optional[Literal["class", "individual", "process"]] = None
    description: Optional[str] = None
    attributes: List[Attribute] = []
    relations: List[Relation] = []

class NodeInput(BaseModel):
    name: str

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
def list_all_nodes(user_id: str, graph_id: str):
    user_id = get_user_id(user_id)
    nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    nodes = []
    if os.path.exists(nodes_dir):
        for file in os.listdir(nodes_dir):
            if file.endswith(".json"):
                node_id = file[:-5]
                summary = safe_node_summary(user_id, graph_id, node_id)
                if summary:
                    nodes.append(summary)
    return nodes

@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
def create_node(user_id: str, graph_id: str, node: Node):
    user_id = get_user_id(user_id)
    node_id = normalize_id(node.name)
    node_data = {
        "id": node_id,
        "name": node.name,
        "qualifier": node.qualifier,
        "role": node.role,
        "description": node.description,
        "attributes": [a.dict() for a in (node.attributes or [])],
        "relations": [r.dict() for r in (node.relations or [])]
    }
    save_node(user_id, graph_id, node_id, node_data)
    # --- Update node_registry.json ---
    registry_path = os.path.join("graph_data", "users", user_id, "node_registry.json")
    import json
    import time
    try:
        if os.path.exists(registry_path):
            with open(registry_path, 'r') as f:
                registry = json.load(f)
        else:
            registry = {}
    except Exception:
        registry = {}
    if node_id not in registry:
        registry[node_id] = {
            "name": node.name,
            "graphs": [graph_id],
            "created_at": time.strftime('%Y-%m-%dT%H:%M:%S'),
            "updated_at": time.strftime('%Y-%m-%dT%H:%M:%S')
        }
    else:
        if graph_id not in registry[node_id].get("graphs", []):
            registry[node_id]["graphs"].append(graph_id)
        registry[node_id]["updated_at"] = time.strftime('%Y-%m-%dT%H:%M:%S')
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)
    # Submit to summary queue after node is created/updated
    sq = init_summary_queue()
    sq.submit(user_id, graph_id, node_id, node_data)
    return {"status": "node created", "id": node_id}

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def update_node(user_id: str, graph_id: str, node_id: str, node: Node):
    user_id = get_user_id(user_id)
    # Load existing node or raise
    try:
        existing = load_node(user_id, graph_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    # Update fields
    updated = existing.copy()
    updated["id"] = node.id or node_id
    updated["name"] = node.name or existing.get("name")
    updated["qualifier"] = node.qualifier or existing.get("qualifier")
    updated["role"] = node.role or existing.get("role")
    updated["description"] = node.description or existing.get("description")
    updated["attributes"] = [a.dict() for a in (node.attributes or [])] or existing.get("attributes", [])
    updated["relations"] = [r.dict() for r in (node.relations or [])] or existing.get("relations", [])
    save_node(user_id, graph_id, node_id, updated)
    # --- Update node_registry.json ---
    registry_path = os.path.join("graph_data", "users", user_id, "node_registry.json")
    import json
    import time
    try:
        if os.path.exists(registry_path):
            with open(registry_path, 'r') as f:
                registry = json.load(f)
        else:
            registry = {}
    except Exception:
        registry = {}
    if node_id not in registry:
        registry[node_id] = {
            "name": updated["name"],
            "graphs": [graph_id],
            "created_at": time.strftime('%Y-%m-%dT%H:%M:%S'),
            "updated_at": time.strftime('%Y-%m-%dT%H:%M:%S')
        }
    else:
        if graph_id not in registry[node_id].get("graphs", []):
            registry[node_id]["graphs"].append(graph_id)
        registry[node_id]["updated_at"] = time.strftime('%Y-%m-%dT%H:%M:%S')
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)
    sq = init_summary_queue()
    sq.submit(user_id, graph_id, node_id, updated)
    return {"status": "node updated", "id": node_id}

@router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def get_node(user_id: str, graph_id: str, node_id: str):
    summary = safe_node_summary(user_id, graph_id, node_id)
    if summary:
        return summary
    else:
        raise HTTPException(status_code=404, detail="Node not found")

@router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
def get_node_info(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = load_node(user_id, graph_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    # Ensure attributes and relations are always present and are lists
    node["attributes"] = node.get("attributes", [])
    node["relations"] = node.get("relations", [])
    return node

@router.get("/users/{user_id}/graphs/{graph_id}/get_nbh/{node_id}")
def get_node_nbh(user_id: str, graph_id: str, node_id: str):
    return get_node_info(user_id, graph_id, node_id)

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/submit_to_summary_queue")
def submit_all_nodes_to_summary_queue(user_id: str, graph_id: str):
    user_id = get_user_id(user_id)
    nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    sq = init_summary_queue()
    count = 0
    if os.path.exists(nodes_dir):
        for file in os.listdir(nodes_dir):
            if file.endswith(".json"):
                node_id = file[:-5]
                try:
                    node_data = load_node(user_id, graph_id, node_id)
                except Exception:
                    continue
                sq.submit(user_id, graph_id, node_id, node_data)
                count += 1
    return {"status": "submitted", "count": count}

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/submit_to_summary_queue")
def submit_node_to_summary_queue(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = load_node(user_id, graph_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    # Only submit if description is missing or empty
    if node.get("description"):
        return {"status": "already processed", "id": node_id}
    sq = init_summary_queue()
    sq.submit(user_id, graph_id, node_id, node)
    return {"status": "submitted", "id": node_id}

