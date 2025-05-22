from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os, yaml, networkx as nx
from networkx.readwrite import json_graph
from core.node_ops import load_node, save_node, node_path
from core.id_utils import normalize_id

router = APIRouter()
GRAPH_DATA_PATH = "graph_data"

class Attribute(BaseModel):
    name: str
    value: str
    quantifier: Optional[str] = None
    modality: Optional[str] = None

class Relation(BaseModel):
    name: str
    target: str
    subject_quantifier: Optional[str] = None
    object_quantifier: Optional[str] = None
    modality: Optional[str] = None

class Node(BaseModel):
    id: str
    label: str
    role: Optional[str] = None
    qualifier: Optional[str] = None
    attributes: Optional[List[Attribute]] = []
    relations: Optional[List[Relation]] = []

class NodeInput(BaseModel):
    name: str



@router.get("/nodes")
def list_all_nodes():
    nodes = []
    for file in os.listdir(GRAPH_DATA_PATH):
        if file.endswith(".yaml"):
            data = load_node(file[:-5])
            if not data:
                continue
            
            # Handle case where data is a list (malformed)
            if isinstance(data, list):
                for item in data:
                    node = item.get("node", {}) if isinstance(item, dict) else {}
                    if node:
                        nodes.append({
                            "id": node.get("id"),
                            "label": node.get("label"),
                            "qualifier": node.get("qualifier")
                        })
                continue

            # Normal case: data is a dict
            node = data.get("node", {})
            if node:
                nodes.append({
                    "id": node.get("id"),
                    "label": node.get("label"),
                    "qualifier": node.get("qualifier")
                })

    return nodes


@router.post("/nodes")
def create_node(node: Node):
    node_id = normalize_id(node.label)
    file_path = os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")

    # Avoid duplicate files
    if os.path.exists(file_path):
        raise HTTPException(status_code=400, detail="Node already exists")

    data = {
        "node": {
            "name": node_id,
            "label": node.label,
            "attributes": []
        },
        "relations": []
    }

    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

    return {"status": "node created", "id": node_id}


