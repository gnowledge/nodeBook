from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import yaml

router = APIRouter()

class NBHRequest(BaseModel):
    node_id: str

def load_node_yaml(node_id: str):
    path = f"graph_data/{node_id}.yaml"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

@router.get("/relations/{node_id}")
def get_relations(node_id: str):
    data = load_node_yaml(node_id)
    relations = data.get("relations", [])
    return [
        {
            "subject": rel.get("subject"),
            "name": rel.get("name"),
            "object": rel.get("object"),
            "subject_quantifier": rel.get("subject_quantifier"),
            "object_quantifier": rel.get("object_quantifier"),
            "modality": rel.get("modality")
        }
        for rel in relations
    ]

@router.get("/attributes/{node_id}")
def get_attributes(node_id: str):
    data = load_node_yaml(node_id)
    attributes = data.get("node", {}).get("attributes", [])
    return [
        {
            "name": attr.get("name"),
            "value": attr.get("value"),
            "quantifier": attr.get("quantifier"),
            "modality": attr.get("modality")
        }
        for attr in attributes
    ]

@router.get("/{node_id}")
def load_neighborhood(node_id: str):
    data = load_node_yaml(node_id)
    node = data.get("node", {})

    return {
        "node": {
            "id": node.get("id"),
            "label": node.get("label"),
            "qualifier": node.get("qualifier")
        },
        "attributes": get_attributes(node_id),
        "relations": get_relations(node_id)
    }
