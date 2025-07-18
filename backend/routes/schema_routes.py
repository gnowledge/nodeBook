from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
import os
import json
import time
from pathlib import Path
from fastapi_users import FastAPIUsers
from backend.routes.users import User
from backend.core.auth_validation import current_active_user

router = APIRouter()

GLOBAL_SCHEMA_DIR = Path("graph_data/global")
USER_SCHEMA_DIR = Path("graph_data/users")

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
    parent_types: Optional[list[str]] = []

class AttributeType(BaseModel):
    name: str
    data_type: str
    description: str
    unit: Optional[str] = None
    domain: list[str] = []
    allowed_values: Optional[list[str]] = None

# ==== Helper Functions ====

def load_global_json(filename, fallback):
    """Load JSON from global schema directory"""
    filepath = GLOBAL_SCHEMA_DIR / filename
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return fallback

def load_user_json(user_id: str, filename, fallback):
    """Load JSON from user schema directory"""
    user_dir = USER_SCHEMA_DIR / user_id
    filepath = user_dir / filename
    if filepath.exists():
        with open(filepath, 'r') as f:
            return json.load(f)
    return fallback

def save_user_json(user_id: str, filename, data):
    """Save JSON to user schema directory"""
    user_dir = USER_SCHEMA_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    filepath = user_dir / filename
    with open(filepath, 'w') as f:
        json.dump(data, f, indent=2)

def combine_schemas(global_data: List[dict], user_data: List[dict], key_field: str = "name") -> List[dict]:
    """Combine global and user schemas, with user schemas taking precedence"""
    combined = global_data.copy()
    user_names = {item[key_field] for item in user_data}
    
    # Remove global items that have user overrides
    combined = [item for item in combined if item[key_field] not in user_names]
    
    # Add user items
    combined.extend(user_data)
    return combined

# ==== Schema Routes ====

@router.get("/users/{user_id}/graphs/{graph_id}/relation-names")
def get_relation_names(user_id: str, graph_id: str):
    """Get all relation names (global + user)"""
    global_relations = load_global_json("relation_types.json", [])
    user_relations = load_user_json(user_id, "relation_types.json", [])
    combined = combine_schemas(global_relations, user_relations)
    return [r["name"] for r in combined]

@router.get("/users/{user_id}/graphs/{graph_id}/attribute-names")
def get_attribute_names(user_id: str, graph_id: str):
    """Get all attribute names (global + user)"""
    global_attributes = load_global_json("attribute_types.json", [])
    user_attributes = load_user_json(user_id, "attribute_types.json", [])
    combined = combine_schemas(global_attributes, user_attributes)
    return [a["name"] for a in combined]

@router.get("/users/{user_id}/graphs/{graph_id}/relation-types")
def get_relation_types(user_id: str, graph_id: str):
    """Get all relation types (global + user)"""
    global_relations = load_global_json("relation_types.json", [])
    user_relations = load_user_json(user_id, "relation_types.json", [])
    return combine_schemas(global_relations, user_relations)

@router.post("/users/{user_id}/graphs/{graph_id}/relation-types/create")
def create_relation_type(
    user_id: str, 
    graph_id: str, 
    rt: RelationType,
    user: User = Depends(current_active_user)
):
    """Create a new relation type in user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create relation type: Access denied. You can only access your own data."
        )
    
    # Check if it already exists in global schemas
    global_relations = load_global_json("relation_types.json", [])
    if any(r["name"] == rt.name for r in global_relations):
        raise HTTPException(status_code=400, detail="Relation type already exists in global schemas")
    
    # Check if it already exists in user schemas
    user_relations = load_user_json(user_id, "relation_types.json", [])
    if any(r["name"] == rt.name for r in user_relations):
        raise HTTPException(status_code=400, detail="Relation type already exists in your schemas")
    
    # Add to user schemas
    user_relations.append(rt.dict())
    save_user_json(user_id, "relation_types.json", user_relations)
    return {"status": "relation type added to user schemas"}

@router.put("/users/{user_id}/graphs/{graph_id}/relation-types/{name}")
def update_relation_type(
    user_id: str, 
    graph_id: str, 
    name: str, 
    rt: RelationType,
    user: User = Depends(current_active_user)
):
    """Update a relation type in user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot update relation type: Access denied. You can only access your own data."
        )
    
    # Check if it exists in global schemas (read-only)
    global_relations = load_global_json("relation_types.json", [])
    if any(r["name"] == name for r in global_relations):
        raise HTTPException(status_code=403, detail="Cannot modify global schema elements. Create a user-specific version instead.")
    
    # Update in user schemas
    user_relations = load_user_json(user_id, "relation_types.json", [])
    for i, entry in enumerate(user_relations):
        if entry["name"] == name:
            user_relations[i] = rt.dict()
            save_user_json(user_id, "relation_types.json", user_relations)
            return {"status": "updated in user schemas"}
    
    raise HTTPException(status_code=404, detail="Relation type not found in user schemas")

@router.delete("/users/{user_id}/graphs/{graph_id}/relation-types/{name}")
def delete_relation_type(
    user_id: str, 
    graph_id: str, 
    name: str,
    user: User = Depends(current_active_user)
):
    """Delete a relation type from user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete relation type: Access denied. You can only access your own data."
        )
    
    # Check if it exists in global schemas (cannot delete)
    global_relations = load_global_json("relation_types.json", [])
    if any(r["name"] == name for r in global_relations):
        raise HTTPException(status_code=403, detail="Cannot delete global schema elements")
    
    # Delete from user schemas
    user_relations = load_user_json(user_id, "relation_types.json", [])
    user_relations = [r for r in user_relations if r["name"] != name]
    save_user_json(user_id, "relation_types.json", user_relations)
    return {"status": "deleted from user schemas"}

@router.get("/users/{user_id}/graphs/{graph_id}/attribute-types")
def get_attribute_types(user_id: str, graph_id: str):
    """Get all attribute types (global + user)"""
    global_attributes = load_global_json("attribute_types.json", [])
    user_attributes = load_user_json(user_id, "attribute_types.json", [])
    return combine_schemas(global_attributes, user_attributes)

@router.post("/users/{user_id}/graphs/{graph_id}/attribute-types")
def create_attribute_type(
    user_id: str, 
    graph_id: str, 
    item: AttributeType,
    user: User = Depends(current_active_user)
):
    """Create a new attribute type in user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create attribute type: Access denied. You can only access your own data."
        )
    
    # Check if it already exists in global schemas
    global_attributes = load_global_json("attribute_types.json", [])
    if any(a["name"] == item.name for a in global_attributes):
        raise HTTPException(status_code=400, detail="Attribute type already exists in global schemas")
    
    # Check if it already exists in user schemas
    user_attributes = load_user_json(user_id, "attribute_types.json", [])
    if any(a["name"] == item.name for a in user_attributes):
        raise HTTPException(status_code=400, detail="Attribute type already exists in your schemas")
    
    # Add to user schemas
    user_attributes.append(item.dict())
    save_user_json(user_id, "attribute_types.json", user_attributes)
    return {"status": "attribute type added to user schemas"}

@router.put("/users/{user_id}/graphs/{graph_id}/attribute-types/{name}")
def update_attribute_type(
    user_id: str, 
    graph_id: str, 
    name: str, 
    item: AttributeType,
    user: User = Depends(current_active_user)
):
    """Update an attribute type in user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot update attribute type: Access denied. You can only access your own data."
        )
    
    # Check if it exists in global schemas (read-only)
    global_attributes = load_global_json("attribute_types.json", [])
    if any(a["name"] == name for a in global_attributes):
        raise HTTPException(status_code=403, detail="Cannot modify global schema elements. Create a user-specific version instead.")
    
    # Update in user schemas
    user_attributes = load_user_json(user_id, "attribute_types.json", [])
    for i, entry in enumerate(user_attributes):
        if entry["name"] == name:
            user_attributes[i] = item.dict()
            save_user_json(user_id, "attribute_types.json", user_attributes)
            return {"status": "updated in user schemas"}
    
    raise HTTPException(status_code=404, detail="Attribute type not found in user schemas")

@router.delete("/users/{user_id}/graphs/{graph_id}/attribute-types/{name}")
def delete_attribute_type(
    user_id: str, 
    graph_id: str, 
    name: str,
    user: User = Depends(current_active_user)
):
    """Delete an attribute type from user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete attribute type: Access denied. You can only access your own data."
        )
    
    # Check if it exists in global schemas (cannot delete)
    global_attributes = load_global_json("attribute_types.json", [])
    if any(a["name"] == name for a in global_attributes):
        raise HTTPException(status_code=403, detail="Cannot delete global schema elements")
    
    # Delete from user schemas
    user_attributes = load_user_json(user_id, "attribute_types.json", [])
    user_attributes = [a for a in user_attributes if a["name"] != name]
    save_user_json(user_id, "attribute_types.json", user_attributes)
    return {"status": "deleted from user schemas"}

@router.get("/users/{user_id}/graphs/{graph_id}/node-types")
def get_node_types(user_id: str, graph_id: str):
    """Get all node types (global + user)"""
    global_nodes = load_global_json("node_types.json", [])
    user_nodes = load_user_json(user_id, "node_types.json", [])
    return combine_schemas(global_nodes, user_nodes)

@router.post("/users/{user_id}/graphs/{graph_id}/node-types")
def create_node_type(
    user_id: str, 
    graph_id: str, 
    item: NodeType,
    user: User = Depends(current_active_user)
):
    """Create a new node type in user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create node type: Access denied. You can only access your own data."
        )
    
    # Check if it already exists in global schemas
    global_nodes = load_global_json("node_types.json", [])
    if any(n["name"] == item.name for n in global_nodes):
        raise HTTPException(status_code=400, detail="Node type already exists in global schemas")
    
    # Check if it already exists in user schemas
    user_nodes = load_user_json(user_id, "node_types.json", [])
    if any(n["name"] == item.name for n in user_nodes):
        raise HTTPException(status_code=400, detail="Node type already exists in your schemas")
    
    # Add to user schemas
    user_nodes.append(item.dict())
    save_user_json(user_id, "node_types.json", user_nodes)
    return {"status": "node type added to user schemas"}

@router.put("/users/{user_id}/graphs/{graph_id}/node-types/{name}")
def update_node_type(
    user_id: str, 
    graph_id: str, 
    name: str, 
    item: NodeType,
    user: User = Depends(current_active_user)
):
    """Update a node type in user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot update node type: Access denied. You can only access your own data."
        )
    
    # Check if it exists in global schemas (read-only)
    global_nodes = load_global_json("node_types.json", [])
    if any(n["name"] == name for n in global_nodes):
        raise HTTPException(status_code=403, detail="Cannot modify global schema elements. Create a user-specific version instead.")
    
    # Update in user schemas
    user_nodes = load_user_json(user_id, "node_types.json", [])
    for i, entry in enumerate(user_nodes):
        if entry["name"] == name:
            user_nodes[i] = item.dict()
            save_user_json(user_id, "node_types.json", user_nodes)
            return {"status": "updated in user schemas"}
    
    raise HTTPException(status_code=404, detail="Node type not found in user schemas")

@router.delete("/users/{user_id}/graphs/{graph_id}/node-types/{name}")
def delete_node_type(
    user_id: str, 
    graph_id: str, 
    name: str,
    user: User = Depends(current_active_user)
):
    """Delete a node type from user space"""
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete node type: Access denied. You can only access your own data."
        )
    
    # Check if it exists in global schemas (cannot delete)
    global_nodes = load_global_json("node_types.json", [])
    if any(n["name"] == name for n in global_nodes):
        raise HTTPException(status_code=403, detail="Cannot delete global schema elements")
    
    # Delete from user schemas
    user_nodes = load_user_json(user_id, "node_types.json", [])
    user_nodes = [n for n in user_nodes if n["name"] != name]
    save_user_json(user_id, "node_types.json", user_nodes)
    return {"status": "deleted from user schemas"}

# ==== Schema Management Routes ====

@router.get("/users/{user_id}/schemas/global")
def get_global_schemas(user_id: str):
    """Get all global schemas (read-only reference)"""
    return {
        "relation_types": load_global_json("relation_types.json", []),
        "attribute_types": load_global_json("attribute_types.json", []),
        "node_types": load_global_json("node_types.json", []),
        "transition_types": load_global_json("transition_types.json", []),
        "function_types": load_global_json("function_types.json", [])
    }

@router.get("/users/{user_id}/schemas/user")
def get_user_schemas(user_id: str):
    """Get user's custom schemas"""
    return {
        "relation_types": load_user_json(user_id, "relation_types.json", []),
        "attribute_types": load_user_json(user_id, "attribute_types.json", []),
        "node_types": load_user_json(user_id, "node_types.json", [])
    }

@router.get("/users/{user_id}/schemas/combined")
def get_combined_schemas(user_id: str):
    """Get combined schemas (global + user)"""
    return {
        "relation_types": get_relation_types(user_id, "dummy"),
        "attribute_types": get_attribute_types(user_id, "dummy"),
        "node_types": get_node_types(user_id, "dummy")
    }
