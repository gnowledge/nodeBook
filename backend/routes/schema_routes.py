from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
import yaml
from core.schema_ops import load_schema, save_schema, ensure_schema_file, load_schema_yaml
from core.id_utils import normalize_id

router = APIRouter()

class RelationType(BaseModel):
    name: str
    inverse_name: str
    symmetric: Optional[bool] = False
    transitive: Optional[bool] = False
    description: Optional[str] = ""

class NodeType(BaseModel):
    name: str
    description: str

class AttributeType(BaseModel):
    name: str
    data_type: str
    description: str

@router.get("/relation-types", operation_id="get_relation_types_schema")
def get_relation_types():
    default = [
        {"name": "member_of", "inverse_name": "has_member", "symmetric": False, "transitive": False, "description": "X is a member of Y"},
        {"name": "is_a", "inverse_name": "has_instance", "symmetric": False, "transitive": True, "description": "X is a subtype of Y"}
    ]
    return load_schema_yaml("relation_types.yaml", default)

@router.post("/relation-types/create")
def create_relation_type(rt: RelationType):
    default = [
        {"name": "member_of", "inverse_name": "has_member", "symmetric": False, "transitive": False, "description": "X is a member of Y"},
        {"name": "is_a", "inverse_name": "has_instance", "symmetric": False, "transitive": True, "description": "X is a subtype of Y"}
    ]
    types = load_schema_yaml("relation_types.yaml", default)
    if any(r["name"] == rt.name for r in types):
        raise HTTPException(status_code=400, detail="Relation type already exists")
    types.append(rt.dict())
    save_schema("relation_types.yaml", types)
    return {"status": "relation type added"}

@router.get("/node-types", operation_id="get_node_types_schema")
def get_node_types():
    default = [
        {"name": "entity", "description": "Generic node type"}
    ]
    return load_schema_yaml("node_types.yaml", default)

@router.get("/attribute-types", operation_id="get_attribute_types_schema")
def get_attribute_types():
    default = [
        {"name": "population", "data_type": "number", "description": "Number of inhabitants"}
    ]
    return load_schema_yaml("attribute_types.yaml", default)

@router.post("/attribute-types", operation_id="create_attribute_type")
def create_attribute_type(item: AttributeType):
    file_path = ensure_schema_file("attribute_types.yaml", [])
    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or []
    data.append(item.dict())
    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)
    return {"status": "success"}
