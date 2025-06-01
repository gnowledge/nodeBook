from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import json
import time
from pathlib import Path

router = APIRouter()

SCHEMA_DIR = Path("graph_data/global")

# ==== Schema Models ====

class RelationType(BaseModel):
    name: str
    inverse_name: str
    symmetric: Optional[bool] = False
    transitive: Optional[bool] = False
    description: Optional[str] = ""
    domain: list[str] = []
    range: list[str] = []

class NodeType(BaseModel):
    name: str
    description: str

class AttributeType(BaseModel):
    name: str
    data_type: str
    description: str
    unit: Optional[str] = None
    domain: list[str] = []
    allowed_values: Optional[list[str]] = None

# ==== File IO Utilities ====

def load_json(filename, fallback):
    file_path = SCHEMA_DIR / filename
    if not file_path.exists():
        return fallback
    with open(file_path, encoding="utf-8") as f:
        return json.load(f)

def save_json(filename, data):
    file_path = SCHEMA_DIR / filename
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def with_file_lock(lockfile: Path, timeout=5.0):
    start = time.time()
    while lockfile.exists():
        if time.time() - start > timeout:
            raise HTTPException(status_code=423, detail="Resource is locked")
        time.sleep(0.1)
    lockfile.touch()
    return lambda: lockfile.unlink()

# ==== Routes ====

@router.get("/users/{user_id}/graphs/{graph_id}/relation-names")
def get_relation_names(user_id: str, graph_id: str):
    data = load_json("relation_types.json", [])
    return [r["name"] for r in data]

@router.get("/users/{user_id}/graphs/{graph_id}/attribute-names")
def get_attribute_names(user_id: str, graph_id: str):
    data = load_json("attribute_types.json", [])
    return [a["name"] for a in data]

@router.get("/users/{user_id}/graphs/{graph_id}/relation-types")
def get_relation_types(user_id: str, graph_id: str):
    return load_json("relation_types.json", [])

@router.post("/users/{user_id}/graphs/{graph_id}/relation-types/create")
def create_relation_type(user_id: str, graph_id: str, rt: RelationType):
    types = load_json("relation_types.json", [])
    if any(r["name"] == rt.name for r in types):
        raise HTTPException(status_code=400, detail="Relation type already exists")
    types.append(rt.dict())
    save_json("relation_types.json", types)
    return {"status": "relation type added"}

@router.put("/users/{user_id}/graphs/{graph_id}/relation-types/{name}")
def update_relation_type(user_id: str, graph_id: str, name: str, rt: RelationType):
    lock_path = SCHEMA_DIR / "relation_types.lock"
    unlock = with_file_lock(lock_path)
    try:
        data = load_json("relation_types.json", [])
        for i, entry in enumerate(data):
            if entry["name"] == name:
                data[i] = rt.dict()
                save_json("relation_types.json", data)
                return {"status": "updated"}
        raise HTTPException(status_code=404, detail="Relation type not found")
    finally:
        unlock()

@router.get("/users/{user_id}/graphs/{graph_id}/attribute-types")
def get_attribute_types(user_id: str, graph_id: str):
    return load_json("attribute_types.json", [])

@router.post("/users/{user_id}/graphs/{graph_id}/attribute-types")
def create_attribute_type(user_id: str, graph_id: str, item: AttributeType):
    data = load_json("attribute_types.json", [])
    data.append(item.dict())
    save_json("attribute_types.json", data)
    return {"status": "attribute type added"}

@router.put("/users/{user_id}/graphs/{graph_id}/attribute-types/{name}")
def update_attribute_type(user_id: str, graph_id: str, name: str, item: AttributeType):
    lock_path = SCHEMA_DIR / "attribute_types.lock"
    unlock = with_file_lock(lock_path)
    try:
        data = load_json("attribute_types.json", [])
        for i, entry in enumerate(data):
            if entry["name"] == name:
                data[i] = item.dict()
                save_json("attribute_types.json", data)
                return {"status": "updated"}
        raise HTTPException(status_code=404, detail="Attribute type not found")
    finally:
        unlock()

@router.get("/users/{user_id}/graphs/{graph_id}/node-types")
def get_node_types(user_id: str, graph_id: str):
    return load_json("node_types.json", [{"name": "entity", "description": "Generic node type"}])
