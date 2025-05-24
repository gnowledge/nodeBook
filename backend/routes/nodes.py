from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Literal
import os, yaml, networkx as nx
from networkx.readwrite import json_graph
from core.node_ops import load_node, save_node, node_path, safe_node_summary
from core.id_utils import normalize_id
router = APIRouter()
GRAPH_DATA_PATH = "graph_data"




class Attribute(BaseModel):
    name: str
    value: Optional[str] = None  # <-- Make value optional to allow empty attributes
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
    qualifier: Optional[str] = None
    role: Optional[Literal["class", "individual", "process"]] = None
    description: Optional[str] = None
    attributes: List[Attribute] = []
    relations: List[Relation] = []


class NodeInput(BaseModel):
    name: str


@router.get("/nodes")
def list_all_nodes():
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
    nodes = []
    for file in os.listdir(GRAPH_DATA_PATH):
        if file.endswith(".yaml"):
            summary = safe_node_summary(file)
            if summary:
                nodes.append(summary)
    return nodes


@router.post("/nodes")
def create_node(node: dict):
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
    name = node.get("name")
    if not name:
        raise HTTPException(status_code=400, detail="Missing node name")
    node_id = normalize_id(name)
    file_path = os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")

    qualifier = node.get("qualifier")
    role = node.get("role")
    description = node.get("description")
    attributes = node.get("attributes", [])
    relations = node.get("relations", [])

    # If node exists, load and update, else create new
    if os.path.exists(file_path):
        with open(file_path, encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}
        data.setdefault("node", {})
        data["node"]["name"] = name
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
                "name": name,
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


@router.put("/nodes/{node_id}")
def update_node(node_id: str, node: dict):
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
    file_path = os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Node not found")

    # Update fields
    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    data.setdefault("node", {})
    data["node"]["name"] = node.get("name", data["node"].get("name"))
    data["node"]["qualifier"] = node.get("qualifier", data["node"].get("qualifier"))
    data["node"]["role"] = node.get("role", data["node"].get("role"))
    data["node"]["description"] = node.get("description", data["node"].get("description"))
    data["node"]["attributes"] = node.get("attributes", data["node"].get("attributes", []))
    data["node"]["id"] = node_id
    data["relations"] = node.get("relations", data.get("relations", []))

    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    return {"status": "node updated", "id": node_id}


@router.get("/nodes/{node_id}")
def get_node(node_id: str):
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
    file_path = os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Node not found")

    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    node_data = data.get("node", {})
    # Ensure attributes and relations are always present and are lists
    node_data["attributes"] = node_data.get("attributes", [])
    node_data["relations"] = data.get("relations", [])
    return node_data


@router.get("/getInfo/{node_id}")
def get_node_info(node_id: str):
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
    file_path = os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Node not found")

    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}

    node_data = data.get("node", {})
    # Ensure attributes and relations are always present and are lists
    node_data["attributes"] = node_data.get("attributes", [])
    node_data["relations"] = data.get("relations", [])
    return node_data


@router.get("/get_nbh/{node_id}")
def get_node_nbh(node_id: str):
    # Alias for get_node_info
    return get_node_info(node_id)

