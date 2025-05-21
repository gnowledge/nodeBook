# routes/attribute_types.py
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os, yaml

router = APIRouter()
ATTRIBUTE_TYPES_FILE = "schema/attribute_types.yaml"

class AttributeType(BaseModel):
    name: str
    data_type: str
    allowed_values: Optional[str] = None
    unit: Optional[str] = None
    domain: List[str]
    description: Optional[str] = None

# Load YAML list

def load_attribute_types():
    if not os.path.exists(ATTRIBUTE_TYPES_FILE):
        return []
    with open(ATTRIBUTE_TYPES_FILE, encoding="utf-8") as f:
        return yaml.safe_load(f) or []

# Save YAML list

def save_attribute_types(data):
    with open(ATTRIBUTE_TYPES_FILE, "w", encoding="utf-8") as f:
        yaml.dump(data, f, allow_unicode=True, sort_keys=False)

@router.get("/attribute-types")
def list_attribute_types():
    return load_attribute_types()

@router.post("/attribute-types")
def create_attribute_type(item: AttributeType):
    data = load_attribute_types()
    if any(x["name"] == item.name for x in data):
        raise HTTPException(status_code=400, detail="AttributeType already exists")
    data.append(item.dict())
    save_attribute_types(data)
    return {"status": "success"}

@router.put("/attribute-types/{name}")
def update_attribute_type(name: str, item: AttributeType):
    data = load_attribute_types()
    for i, x in enumerate(data):
        if x["name"] == name:
            data[i] = item.dict()
            save_attribute_types(data)
            return {"status": "updated"}
    raise HTTPException(status_code=404, detail="AttributeType not found")

@router.delete("/attribute-types/{name}")
def delete_attribute_type(name: str):
    data = load_attribute_types()
    filtered = [x for x in data if x["name"] != name]
    if len(filtered) == len(data):
        raise HTTPException(status_code=404, detail="AttributeType not found")
    save_attribute_types(filtered)
    return {"status": "deleted"}
