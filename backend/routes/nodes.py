from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import os, yaml, networkx as nx
from networkx.readwrite import json_graph

router = APIRouter()
GRAPH_DATA_PATH = "graph_data"

class Attribute(BaseModel):
    name: str
    value: str
    quantifier: Optional[str] = None
    modality: Optional[str] = None

class Relation(BaseModel):
    type: str
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

def node_path(node_id):
    return os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")

def load_node(node_id):
    path = node_path(node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

def save_node(node_data):
    os.makedirs(GRAPH_DATA_PATH, exist_ok=True)
    with open(node_path(node_data['node']['id']), "w", encoding="utf-8") as f:
        yaml.dump(node_data, f, allow_unicode=True, sort_keys=False)

@router.get("/nodes")
def list_all_nodes():
    nodes = []
    for file in os.listdir(GRAPH_DATA_PATH):
        if file.endswith(".yaml"):
            data = load_node(file[:-5])
            node = data.get("node", {})
            nodes.append({
                "id": node.get("id"),
                "label": node.get("label"),
                "qualifier": node.get("qualifier")
            })
    return nodes

@router.post("/nodes")
def create_simple_node(item: NodeInput):
    node_id = item.name.lower().replace(" ", "_")
    if os.path.exists(node_path(node_id)):
        raise HTTPException(status_code=400, detail="Node already exists")
    node_data = {
        "node": {
            "id": node_id,
            "label": item.name,
            "attributes": [],
        },
        "relations": []
    }
    save_node(node_data)
    return {"status": "created", "id": node_id}
