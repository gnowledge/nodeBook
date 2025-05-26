from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
import os, yaml, networkx as nx
from networkx.readwrite import json_graph
from core.node_ops import load_node, save_node, node_path, safe_node_summary
from core.id_utils import normalize_id, get_graph_path, get_user_id

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
    name: str
    qualifier: Optional[Literal["class", "individual", "process"]] = None
    role: Optional[Literal["class", "individual", "process"]] = None
    description: Optional[str] = None
    attributes: List[Attribute] = []
    relations: List[Relation] = []

class NodeInput(BaseModel):
    name: str

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
def list_all_nodes(user_id: str, graph_id: str):
    try:
        user_id = get_user_id(user_id)
    except TypeError:
        user_id = get_user_id()
    
    """
    List all nodes.

    Returns:
        [
            {
                "id": "node_id",
                "name": "Node Name",
                "label": "Node Label",
                ...
            },
            ...
        ]
    """
    user_id = get_user_id(user_id)
    graph_path = get_graph_path(user_id, graph_id)
    nodes = []
    for file in os.listdir(graph_path):
        if file.endswith(".yaml"):
            summary = safe_node_summary(user_id, graph_id, file)
            if summary:
                nodes.append(summary)
    return nodes

@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
def create_node(user_id: str, graph_id: str, node: Node):
    try:
        user_id = get_user_id(user_id)
    except TypeError:
        user_id = get_user_id()
    
    """
    Create or update a node.

    Expected JSON payload:
        {
            "name": "Node Name",
            "qualifier": "optional qualifier",
            "role": "optional role",
            "description": "optional description",
            "attributes": [
                {
                    "name": "attr_name",
                    "value": "attr_value",
                    "quantifier": "optional",
                    "modality": "optional"
                }
            ],
            "relations": [
                {
                    "name": "relation_type",
                    "target": "target_node_id",
                    "subject_quantifier": "optional",
                    "object_quantifier": "optional",
                    "modality": "optional"
                }
            ]
        }

    Returns:
        {
            "status": "node created",
            "id": "node_id"
        }
    """
    user_id = get_user_id(user_id)
    graph_id = get_graph_path(user_id, graph_id)
    node_id = normalize_id(node.name)
    file_path = os.path.join(graph_path, f"{node_id}.yaml")

    qualifier = node.qualifier
    role = node.role
    description = node.description
    attributes = node.attributes or []
    relations = node.relations or []

    # If node exists, load and update, else create new
    if os.path.exists(file_path):
        with open(file_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        data.setdefault("node", {})
        data["node"]["name"] = node.name
        data["node"]["qualifier"] = qualifier
        data["node"]["role"] = role
        data["node"]["description"] = description
        data["node"]["attributes"] = attributes
        data["node"]["id"] = node_id
        data["relations"] = relations
        status = "node updated"
    else:
        data = {
            "node": {
                "id": node_id,
                "name": node.name,
                "qualifier": qualifier,
                "role": role,
                "description": description,
                "attributes": attributes
            },
            "relations": relations
        }
        status = "node created"

    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    return {"status": status, "id": node_id}

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def update_node(user_id: str, graph_id: str, node_id: str, node: Node):
    try:
        user_id = get_user_id(user_id)
    except TypeError:
        user_id = get_user_id()
    
    """
    Update an existing node.

    Args:
        node_id (str): The node's ID (normalized).
        node (dict): Node data (same structure as POST).

    Returns:
        {
            "status": "node updated",
            "id": "node_id"
        }
    """
    user_id = get_user_id(user_id)
    graph_path = get_graph_path(user_id, graph_id)
    file_path = os.path.join(graph_path, f"{node_id}.yaml")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Node not found")

    # Update fields
    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    data.setdefault("node", {})
    data["node"]["name"] = node.name or data["node"].get("name")
    data["node"]["qualifier"] = node.qualifier or data["node"].get("qualifier")
    data["node"]["role"] = node.role or data["node"].get("role")
    data["node"]["description"] = node.description or data["node"].get("description")
    data["node"]["attributes"] = node.attributes or data["node"].get("attributes", [])
    data["node"]["id"] = node_id
    data["relations"] = node.relations or data.get("relations", [])

    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    return {"status": "node updated", "id": node_id}

@router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def get_node(user_id: str, graph_id: str, node_id: str):
    # Use safe_node_summary to get description_html
    file = f"{node_id}.yaml"
    summary = safe_node_summary(user_id, graph_id, file)
    if summary:
        return summary
    else:
        raise HTTPException(status_code=404, detail="Node not found")

@router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
def get_node_info(user_id: str, graph_id: str, node_id: str):
    try:
        user_id = get_user_id(user_id)
    except TypeError:
        user_id = get_user_id()
    
    """
    Get a node's details by node_id.

    Args:
        node_id (str): The node's ID (normalized).

    Returns:
        {
            "id": "node_id",
            "name": "Node Name",
            "qualifier": "optional qualifier",
            "role": "optional role",
            "description": "optional description",
            "attributes": [...],
            "relations": [...]
        }
    """
    user_id = get_user_id(user_id)
    graph_path = get_graph_path(user_id, graph_id)
    file_path = os.path.join(graph_path, f"{node_id}.yaml")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Node not found")

    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    node_data = data.get("node", {})
    # Ensure attributes and relations are always present and are lists
    node_data["attributes"] = node_data.get("attributes", [])
    node_data["relations"] = data.get("relations", [])
    return node_data

@router.get("/users/{user_id}/graphs/{graph_id}/get_nbh/{node_id}")
def get_node_nbh(user_id: str, graph_id: str, node_id: str):
    # Alias for get_node_info
    return get_node_info(user_id, graph_id, node_id)

