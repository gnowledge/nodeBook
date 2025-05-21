# routes/relation_types.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os, yaml

router = APIRouter()
RELATION_TYPES_FILE = "schema/relation_types.yaml"

class RelationType(BaseModel):
    name: str
    inverse_name: str
    symmetric: bool = False
    transitive: bool = False
    description: Optional[str] = None

# Load YAML list

def load_relation_types():
    if not os.path.exists(RELATION_TYPES_FILE):
        return []
    with open(RELATION_TYPES_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f) or []

# Save YAML list

def save_relation_types(data):
    with open(RELATION_TYPES_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False)

@router.get("/relation-types")
def list_relation_types():
    return load_relation_types()

@router.post("/relation-types")
def create_relation_type(item: RelationType):
    data = load_relation_types()
    if any(x["name"] == item.name for x in data):
        raise HTTPException(status_code=400, detail="RelationType already exists")
    data.append(item.dict())
    save_relation_types(data)
    return {"status": "success"}

@router.put("/relation-types/{name}")
def update_relation_type(name: str, item: RelationType):
    data = load_relation_types()
    for i, x in enumerate(data):
        if x["name"] == name:
            data[i] = item.dict()
            save_relation_types(data)
            return {"status": "updated"}
    raise HTTPException(status_code=404, detail="RelationType not found")

@router.delete("/relation-types/{name}")
def delete_relation_type(name: str):
    data = load_relation_types()
    filtered = [x for x in data if x["name"] != name]
    if len(filtered) == len(data):
        raise HTTPException(status_code=404, detail="RelationType not found")
    save_relation_types(filtered)
    return {"status": "deleted"}
