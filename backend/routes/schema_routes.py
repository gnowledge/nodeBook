from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import yaml

router = APIRouter()

class RelationType(BaseModel):
    name: str
    inverse_name: str
    description: str

class NodeType(BaseModel):
    name: str
    description: str

class AttributeType(BaseModel):
    name: str
    data_type: str
    description: str


def ensure_schema_file(file_name: str, default_data: list):
    print(f"[DEBUG] Checking if schema file exists: graph_data/{file_name}")
    file_path = os.path.join("graph_data", file_name)
    if not os.path.exists(file_path):
        print(f"[DEBUG] File does not exist. Creating: {file_path}")
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(default_data, f)
    else:
        print(f"[DEBUG] File already exists: {file_path}")
    return file_path


def load_schema_yaml(file_name: str, default_data: list):
    print(f"[DEBUG] Attempting to load schema: {file_name}")
    file_path = ensure_schema_file(file_name, default_data)
    print(f"[DEBUG] Resolved file path: {file_path}")
    with open(file_path, encoding="utf-8") as f:
        print("[DEBUG] File opened successfully.")
        data = yaml.safe_load(f)
        print(f"[DEBUG] Raw YAML data: {data}")
    if data is None:
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(default_data, f)
        print("[DEBUG] File was empty. Writing default data.")
        return default_data
    print("[DEBUG] Returning parsed data.")
    return data

@router.get("/relation-types", operation_id="get_relation_types_schema")
def get_relation_types():
    default = [
        {"name": "member_of", "inverse_name": "has_member", "description": "X is a member of Y"},
        {"name": "is_a", "inverse_name": "has_instance", "description": "X is a subtype of Y"}
    ]
    return load_schema_yaml("relation_types.yaml", default)

@router.post("/relation-types", operation_id="create_relation_type")
def create_relation_type(item: RelationType):
    file_path = ensure_schema_file("relation_types.yaml", [])
    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f) or []
    data.append(item.dict())
    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)
    return {"status": "success"}

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
