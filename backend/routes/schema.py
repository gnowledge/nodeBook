from fastapi import APIRouter, HTTPException
import yaml
import os

router = APIRouter()

BASE_PATH = "schema"  # or wherever you store the YAML files

def load_yaml(filename):
    path = os.path.join(BASE_PATH, filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"{filename} not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)

@router.get("/node-types")
def get_node_types():
    return load_yaml("node_types.yaml")

@router.get("/attribute-types")
def get_attribute_types():
    return load_yaml("attribute_types.yaml")

@router.get("/relation-types")
def get_relation_types():
    return load_yaml("relation_types.yaml")
