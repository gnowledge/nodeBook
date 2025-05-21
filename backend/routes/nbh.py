# === routes/nbh.py ===
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import yaml
import networkx as nx
from networkx.readwrite import json_graph

router = APIRouter()

class NBHRequest(BaseModel):
    node_id: str

@router.get("/{node_id}")
def load_neighborhood(node_id: str):
    path = f"graph_data/{node_id}.yaml"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    G = nx.DiGraph()
    node = data["node"]
    G.add_node(node["id"], **{a["name"]: a["value"] for a in node.get("attributes", [])})
    for rel in data.get("relations", []):
        G.add_edge(node["id"], rel["target"], type=rel["type"])
    return json_graph.node_link_data(G)

