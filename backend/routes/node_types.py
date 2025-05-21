# routes/node_types.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os, yaml

router = APIRouter()
NODE_TYPES_FILE = "schema/node_types.yaml"

class NodeType(BaseModel):
    name: str
    description: str

# Load YAML list

def load_node_types():
    if not os.path.exists(NODE_TYPES_FILE):
        return []
    with open(NODE_TYPES_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f) or []

# Save YAML list

def save_node_types(data):
    with open(NODE_TYPES_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False)

@router.get("/node-types")
def list_node_types():
    return load_node_types()

@router.post("/node-types")
def create_node_type(item: NodeType):
    data = load_node_types()
    if any(x["name"] == item.name for x in data):
        raise HTTPException(status_code=400, detail="NodeType already exists")
    data.append(item.dict())
    save_node_types(data)
    return {"status": "success"}

@router.put("/node-types/{name}")
def update_node_type(name: str, item: NodeType):
    data = load_node_types()
    for i, x in enumerate(data):
        if x["name"] == name:
            data[i] = item.dict()
            save_node_types(data)
            return {"status": "updated"}
    raise HTTPException(status_code=404, detail="NodeType not found")

@router.delete("/node-types/{name}")
def delete_node_type(name: str):
    data = load_node_types()
    filtered = [x for x in data if x["name"] != name]
    if len(filtered) == len(data):
        raise HTTPException(status_code=404, detail="NodeType not found")
    save_node_types(filtered)
    return {"status": "deleted"}
