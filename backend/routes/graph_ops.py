"""
This module provides API endpoints and helper functions for managing node attributes and relations in the NDF Studio knowledge graph backend.

Key Features:
- All node data is stored as JSON files under graph_data/users/{user_id}/nodes/{node_id}.json.
- Attribute and relation types are validated against global schema files (attribute_types.json, relation_types.json).
- Endpoints support full CRUD (create, update, delete) for both attributes and relations.
- When creating or updating a relation, if the source or target node does not exist, the canonical create_node function from nodes.py is called to ensure proper node creation and registry updates.
- All endpoints are designed for robust integration with the frontend, supporting both selection and creation of new nodes/relations/attributes.

Endpoints:
- POST   /users/{user_id}/graphs/{graph_id}/attribute/create
- PUT    /users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}
- DELETE /users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}
- POST   /users/{user_id}/graphs/{graph_id}/relation/create
- PUT    /users/{user_id}/graphs/{graph_id}/relation/update/{source}/{name}/{target}
- DELETE /users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}

Helpers:
- node_path, load_node, save_node: JSON-based node storage helpers.
- load_schema: Loads global schema files for validation.

All logic is designed to be robust, extensible, and consistent with the rest of the backend.
"""

import os
import json
from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import JSONResponse
from backend.core.id_utils import get_graph_path
from backend.core.models import Attribute, Relation, AttributeNode, RelationNode
from backend.routes.nodes import create_polynode
from backend.core.registry import (
    relation_registry_path, attribute_registry_path, load_registry, save_registry, make_relation_id, make_attribute_id
)
from backend.core.compose import compose_graph
from backend.core.atomic_ops import (
    atomic_write, save_json_file_atomic, load_json_file, atomic_registry_save,
    graph_transaction, AtomicityError, atomic_node_save, atomic_relation_save, atomic_composed_save, atomic_attribute_save
)
from datetime import datetime
from pathlib import Path
from pydantic import BaseModel
from typing import Optional, List, Dict, Any, Literal
from backend.core.validation import require_user_and_graph
from backend.routes.users import current_active_user, User
from backend.core.auth_validation import require_graph_exists
from backend.core.atomic_ops import validate_data_consistency as validate_consistency
from backend.core.atomic_ops import cleanup_old_backups as cleanup_backups
from backend.core import dal

# Request models for morph operations
class MorphOperationRequest(BaseModel):
    morph_id: str

class MoveMorphRequest(BaseModel):
    from_morph_id: str
    to_morph_id: str

class CreateMorphRequest(BaseModel):
    node_id: str
    name: str
    copy_from_morph: Optional[str] = None  # Optional: copy all properties from this morph (can be any existing morph, not just basic)
    # If copy_from_morph is None, creates an empty morph that user can populate later
    # morph_id is auto-generated as {name}_{node_id}

router = APIRouter()

# ---------- Helper Functions for Registry ----------

def update_registry_entry(registry, entry):
    updated = False
    for i, r in enumerate(registry):
        if r["id"] == entry["id"]:
            registry[i] = entry
            updated = True
            break
    if not updated:
        registry.append(entry)
    return registry

def remove_registry_entry(registry, entry_id):
    return [r for r in registry if r["id"] != entry_id]

# ---------- AttributeNode Routes with Registry ----------
# ... existing code ...
# --- Legacy attribute and relation CRUD functions (commented out, kept for reference) ---
# @router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
# def create_attribute(user_id: str, graph_id: str, attr: Attribute):
#     ... (legacy logic)
#
# @router.put("/users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}")
# def update_attribute(user_id: str, graph_id: str, node_id: str, attr_name: str, attr: Attribute):
#     ... (legacy logic)
#
# @router.delete("/users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}")
# def delete_attribute(user_id: str, graph_id: str, node_id: str, attr_name: str):
#     ... (legacy logic)
#
# @router.post("/users/{user_id}/graphs/{graph_id}/relation/create")
# def create_relation(user_id: str, graph_id: str, rel: Relation):
#     ... (legacy logic)
#
# @router.put("/users/{user_id}/graphs/{graph_id}/relation/update/{source}/{name}/{target}")
# def update_relation(user_id: str, graph_id: str, source: str, name: str, target: str, rel: Relation):
#     ... (legacy logic)
#
# @router.delete("/users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}")
# def delete_relation(user_id: str, graph_id: str, source: str, name: str, target: str):
#     ... (legacy logic)

# --- AttributeNode CRUD with legacy route decorators ---

@router.get("/users/{user_id}/graphs/{graph_id}/attributeNodes/{attribute_id}")
def get_attribute_node(user_id: str, graph_id: str, attribute_id: str):
    """Get a specific attribute node by its ID"""
    try:
        return dal.read_attribute(user_id, attribute_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="AttributeNode not found")

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/create")
async def create_attribute_node(
    user_id: str, 
    graph_id: str, 
    attr: AttributeNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create attribute: Access denied. You can only access your own data."
        )
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "create_attribute_node") as backup_dir:
            # Validate required fields
            if not attr.source_id or attr.source_id is None:
                raise HTTPException(status_code=400, detail="source_id is required and cannot be null")
            if not attr.name or attr.name is None:
                raise HTTPException(status_code=400, detail="name is required and cannot be null")
            
            attr.id = make_attribute_id(
                attr.source_id,
                attr.name,
                str(attr.value) if attr.value is not None else "",
                attr.unit or "",
                attr.adverb or "",
                attr.modality or ""
            )
            
            # Validate that the generated ID is not None or empty
            if not attr.id:
                raise HTTPException(status_code=500, detail="Failed to generate valid attribute ID")
            
            # Check if attribute already exists
            try:
                existing_attr = dal.read_attribute(user_id, attr.id)
                morph_id = getattr(attr, 'morph_id', None)
                if not morph_id:
                    morph_id = f"basic_{attr.source_id}"
                
                # Extract the first morph_id for string operations
                morph_id_str = morph_id[0] if isinstance(morph_id, list) else morph_id
                
                existing_attr["morph_id"] = [morph_id_str] if isinstance(morph_id, str) else morph_id
                dal.update_attribute(user_id, attr.id, existing_attr)
                
                # Update registry with morph_id
                registry = dal.load_registry(user_id, "attribute")
                if attr.id in registry:
                    registry[attr.id]["morph_id"] = [morph_id_str] if isinstance(morph_id, str) else morph_id
                else:
                    registry[attr.id] = {
                        "id": attr.id,
                        "name": attr.name,
                        "source_id": attr.source_id,
                        "morph_id": [morph_id_str],
                        "graphs": [graph_id],
                        "created_at": datetime.utcnow().isoformat()
                    }
                dal.save_registry(user_id, "attribute", registry)
                
                # Ensure the attribute is properly associated with the morph in the source node
                source_node = dal.read_node(user_id, attr.source_id)
                if "morphs" not in source_node:
                    source_node["morphs"] = []
                target_morph = None
                for morph in source_node["morphs"]:
                    if morph.get("morph_id") == morph_id_str:
                        target_morph = morph
                        break
                if not target_morph:
                    target_morph = {
                        "morph_id": morph_id_str,
                        "node_id": attr.source_id,
                        "name": morph_id_str.replace(f"{attr.source_id}_", ""),
                        "relationNode_ids": [],
                        "attributeNode_ids": []
                    }
                    source_node["morphs"].append(target_morph)
                if "attributeNode_ids" not in target_morph:
                    target_morph["attributeNode_ids"] = []
                if attr.id not in target_morph["attributeNode_ids"]:
                    target_morph["attributeNode_ids"].append(attr.id)
                if not source_node.get("nbh"):
                    source_node["nbh"] = morph_id_str
                dal.update_node(user_id, attr.source_id, source_node)
                return {"status": "AttributeNode already exists", "attribute_id": attr.id}
            except FileNotFoundError:
                # Attribute does not exist, so create it
                pass

            # Determine morph_id - use provided or default to basic
            morph_id = getattr(attr, 'morph_id', None)
            if not morph_id:
                morph_id = f"basic_{attr.source_id}"
            
            # Set the morph_id in the attribute (ensure it's a list)
            attr.morph_id = [morph_id] if isinstance(morph_id, str) else morph_id
            
            # Extract the first morph_id for string operations
            morph_id_str = morph_id[0] if isinstance(morph_id, list) else morph_id
            
            # Atomically save attribute file
            dal.create_attribute(user_id, attr.id, attr.dict())
            
            # Load and update registry atomically
            registry = dal.load_registry(user_id, "attribute")
            entry = registry.get(attr.id, {
                "id": attr.id,
                "name": attr.name,
                "source_id": attr.source_id,
                "morph_id": [morph_id_str],  # Add morph_id to registry
                "graphs": [],
                "created_at": datetime.utcnow().isoformat()
            })
            if graph_id not in entry["graphs"]:
                entry["graphs"].append(graph_id)
            registry[attr.id] = entry
            dal.save_registry(user_id, "attribute", registry)

            # Update source node's morph with this attribute atomically
            source_node = dal.read_node(user_id, attr.source_id)
            
            # Ensure morphs array exists
            if "morphs" not in source_node:
                source_node["morphs"] = []
            
            # Find the correct morph
            target_morph = None
            if morph_id:
                # First try to find the specific morph requested
                for morph in source_node["morphs"]:
                    if morph.get("morph_id") == morph_id_str:
                        target_morph = morph
                        break
                
                # If the requested morph doesn't exist, create it
                if not target_morph:
                    target_morph = {
                        "morph_id": morph_id_str,
                        "node_id": attr.source_id,
                        "name": morph_id_str.replace(f"{attr.source_id}_", ""),
                        "relationNode_ids": [],
                        "attributeNode_ids": []
                    }
                    source_node["morphs"].append(target_morph)
            else:
                # No morph_id provided, fallback to basic morph
                for morph in source_node["morphs"]:
                    if morph.get("name") == "basic":
                        target_morph = morph
                        break
                if not target_morph:
                    # Create basic morph
                    target_morph = {
                        "morph_id": f"basic_{attr.source_id}",
                        "node_id": attr.source_id,
                        "name": "basic",
                        "relationNode_ids": [],
                        "attributeNode_ids": []
                    }
                    source_node["morphs"].append(target_morph)
            
            # Add attribute to the morph
            if "attributeNode_ids" not in target_morph:
                target_morph["attributeNode_ids"] = []
            if attr.id not in target_morph["attributeNode_ids"]:
                target_morph["attributeNode_ids"].append(attr.id)
            
            # Set nbh to this morph if not already set
            if not source_node.get("nbh"):
                source_node["nbh"] = morph_id_str
            
            # Atomically save updated source node
            dal.update_node(user_id, attr.source_id, source_node)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "AttributeNode created and registered", "attribute_id": attr.id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create AttributeNode: {str(e)}")

@router.put("/users/{user_id}/graphs/{graph_id}/attribute/update/{node_id}/{attr_name}")
async def update_attribute_node(
    user_id: str, 
    graph_id: str, 
    node_id: str, 
    attr_name: str, 
    attr: AttributeNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot update attribute: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "update_attribute_node") as backup_dir:
            attr.id = make_attribute_id(
                attr.source_id,
                attr.name,
                str(attr.value) if attr.value is not None else "",
                attr.unit or "",
                attr.adverb or "",
                attr.modality or ""
            )
            
            # Check if attribute exists
            try:
                dal.read_attribute(user_id, attr.id)
            except FileNotFoundError:
                raise HTTPException(status_code=404, detail="AttributeNode not found")

            # Atomically save attribute file
            dal.update_attribute(user_id, attr.id, attr.dict())
            
            # Load and update registry atomically
            registry = dal.load_registry(user_id, "attribute")
            entry = registry.get(attr.id, {
                "id": attr.id,
                "name": attr.name,
                "source_id": attr.source_id,
                "morph_id": getattr(attr, 'morph_id', None),  # Add morph_id to registry
                "graphs": [],
                "created_at": datetime.utcnow().isoformat()
            })
            if graph_id not in entry["graphs"]:
                entry["graphs"].append(graph_id)
            registry[attr.id] = entry
            dal.save_registry(user_id, "attribute", registry)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "AttributeNode updated and registry synced"}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update AttributeNode: {str(e)}")

@router.delete("/users/{user_id}/graphs/{graph_id}/attribute/delete/{node_id}/{attr_name}")
async def delete_attribute_node(
    user_id: str, 
    graph_id: str, 
    node_id: str, 
    attr_name: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete attribute: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "delete_attribute_node") as backup_dir:
            # Find the attributeNode id by node_id and attr_name
            registry = dal.load_registry(user_id, "attribute")
            attr_id = None
            for k, v in registry.items():
                if v.get("source_id") == node_id and v.get("name") == attr_name:
                    attr_id = k
                    break
            if not attr_id:
                raise HTTPException(status_code=404, detail="AttributeNode not found")
            
            # Remove the attribute file atomically
            dal.delete_attribute(user_id, attr_id)
            
            # Update registry atomically
            if attr_id in registry:
                del registry[attr_id]
                dal.save_registry(user_id, "attribute", registry)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "AttributeNode deleted and registry updated"}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete AttributeNode: {str(e)}")

@router.delete("/users/{user_id}/graphs/{graph_id}/attributes/{attribute_id}")
async def delete_attribute_node_by_id(
    user_id: str, 
    graph_id: str, 
    attribute_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete attribute: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    """Delete a specific attribute node by its ID"""
    try:
        with graph_transaction(user_id, graph_id, "delete_attribute_node_by_id") as backup_dir:
            registry = dal.load_registry(user_id, "attribute")
            
            if attribute_id not in registry:
                raise HTTPException(status_code=404, detail="AttributeNode not found")
            
            # Get the source_id before removing from registry
            source_id = registry[attribute_id].get("source_id")
            
            # Remove the attribute file atomically
            dal.delete_attribute(user_id, attribute_id)
            
            # Remove from registry atomically
            del registry[attribute_id]
            dal.save_registry(user_id, "attribute", registry)
            
            # Update source node's morphs to remove this attribute atomically
            if source_id:
                source_node = dal.read_node(user_id, source_id)
                
                # Remove from all morphs
                if "morphs" in source_node:
                    for morph in source_node["morphs"]:
                        if "attributeNode_ids" in morph and attribute_id in morph["attributeNode_ids"]:
                            morph["attributeNode_ids"].remove(attribute_id)
                
                # Atomically save updated source node
                dal.update_node(user_id, source_id, source_node)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "AttributeNode deleted and registry updated"}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete AttributeNode: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/unlist_from_morph/{node_id}/{attr_name}")
def unlist_attribute_from_morph(user_id: str, graph_id: str, node_id: str, attr_name: str, request: MorphOperationRequest):
    """
    Remove an attribute from a specific morph without deleting the attribute itself.
    The attribute continues to exist in other morphs.
    """
    try:
        with graph_transaction(user_id, graph_id, "unlist_attribute_from_morph") as backup_dir:
            morph_id = request.morph_id
            # Find the attributeNode id by node_id and attr_name
            registry = dal.load_registry(user_id, "attribute")
            attr_id = None
            for k, v in registry.items():
                if v.get("source_id") == node_id and v.get("name") == attr_name:
                    attr_id = k
                    break
            if not attr_id:
                raise HTTPException(status_code=404, detail="AttributeNode not found")
            
            # Update source node to remove attribute from specific morph
            source_node = dal.read_node(user_id, node_id)
            
            # Find the specific morph and remove the attribute
            morph_found = False
            for morph in source_node.get("morphs", []):
                if morph.get("morph_id") == morph_id:
                    morph_found = True
                    if "attributeNode_ids" in morph and attr_id in morph["attributeNode_ids"]:
                        morph["attributeNode_ids"].remove(attr_id)
                        break
            
            if not morph_found:
                raise HTTPException(status_code=404, detail=f"Morph {morph_id} not found")
            
            # Atomically save updated source node
            dal.update_node(user_id, node_id, source_node)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "Attribute unlisted from morph", "attribute_id": attr_id, "morph_id": morph_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to unlist attribute from morph: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/add_to_morph/{node_id}/{attr_name}")
def add_attribute_to_morph(user_id: str, graph_id: str, node_id: str, attr_name: str, request: MorphOperationRequest):
    """
    Add an existing attribute to a specific morph.
    """
    try:
        with graph_transaction(user_id, graph_id, "add_attribute_to_morph") as backup_dir:
            morph_id = request.morph_id
            # Find the attributeNode id by node_id and attr_name
            registry = dal.load_registry(user_id, "attribute")
            attr_id = None
            for k, v in registry.items():
                if v.get("source_id") == node_id and v.get("name") == attr_name:
                    attr_id = k
                    break
            if not attr_id:
                raise HTTPException(status_code=404, detail="AttributeNode not found")
            
            # Update source node to add attribute to specific morph
            source_node = dal.read_node(user_id, node_id)
            
            # Find the specific morph and add the attribute
            morph_found = False
            for morph in source_node.get("morphs", []):
                if morph.get("morph_id") == morph_id:
                    morph_found = True
                    if "attributeNode_ids" not in morph:
                        morph["attributeNode_ids"] = []
                    if attr_id not in morph["attributeNode_ids"]:
                        morph["attributeNode_ids"].append(attr_id)
                    break
            
            if not morph_found:
                raise HTTPException(status_code=404, detail=f"Morph {morph_id} not found")
            
            # Atomically save updated source node
            dal.update_node(user_id, node_id, source_node)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "Attribute added to morph", "attribute_id": attr_id, "morph_id": morph_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add attribute to morph: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/move_to_morph/{node_id}/{attr_name}")
def move_attribute_to_morph(user_id: str, graph_id: str, node_id: str, attr_name: str, request: MoveMorphRequest):
    """
    Move an attribute from one morph to another.
    """
    try:
        print(f"[DEBUG] move_attribute_to_morph called: user_id={user_id}, graph_id={graph_id}, node_id={node_id}, attr_name={attr_name}, from_morph_id={request.from_morph_id}, to_morph_id={request.to_morph_id}")
        with graph_transaction(user_id, graph_id, "move_attribute_to_morph") as backup_dir:
            from_morph_id = request.from_morph_id
            to_morph_id = request.to_morph_id
            # Find the attributeNode id by node_id and attr_name
            registry = dal.load_registry(user_id, "attribute")
            attr_id = None
            for k, v in registry.items():
                if v.get("source_id") == node_id and v.get("name") == attr_name:
                    attr_id = k
                    break
            print(f"[DEBUG] Found attr_id: {attr_id}")
            if not attr_id:
                raise HTTPException(status_code=404, detail="AttributeNode not found")
            
            # Update source node to move attribute between morphs
            source_node = dal.read_node(user_id, node_id)
            
            # Find both morphs
            from_morph = None
            to_morph = None
            for morph in source_node.get("morphs", []):
                if morph.get("morph_id") == from_morph_id:
                    from_morph = morph
                if morph.get("morph_id") == to_morph_id:
                    to_morph = morph
            print(f"[DEBUG] from_morph: {from_morph}")
            print(f"[DEBUG] to_morph: {to_morph}")
            if not from_morph:
                raise HTTPException(status_code=404, detail=f"Source morph {from_morph_id} not found")
            if not to_morph:
                raise HTTPException(status_code=404, detail=f"Target morph {to_morph_id} not found")
            print(f"[DEBUG] from_morph attributeNode_ids before: {from_morph.get('attributeNode_ids', [])}")
            print(f"[DEBUG] to_morph attributeNode_ids before: {to_morph.get('attributeNode_ids', [])}")
            # Remove from source morph
            if "attributeNode_ids" in from_morph and attr_id in from_morph["attributeNode_ids"]:
                from_morph["attributeNode_ids"].remove(attr_id)
            # Add to target morph
            if "attributeNode_ids" not in to_morph:
                to_morph["attributeNode_ids"] = []
            if attr_id not in to_morph["attributeNode_ids"]:
                to_morph["attributeNode_ids"].append(attr_id)
            print(f"[DEBUG] from_morph attributeNode_ids after: {from_morph.get('attributeNode_ids', [])}")
            print(f"[DEBUG] to_morph attributeNode_ids after: {to_morph.get('attributeNode_ids', [])}")
            # Atomically save updated source node
            dal.update_node(user_id, node_id, source_node)
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            return {"status": "Attribute moved between morphs", "attribute_id": attr_id, "from_morph_id": from_morph_id, "to_morph_id": to_morph_id}
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to move attribute between morphs: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/attribute/copy_to_morph/{node_id}/{attr_name}")
def copy_attribute_to_morph(user_id: str, graph_id: str, node_id: str, attr_name: str, request: MorphOperationRequest):
    """
    Copy an existing attribute to a specific morph (keeps it in all other morphs as well).
    """
    try:
        with graph_transaction(user_id, graph_id, "copy_attribute_to_morph") as backup_dir:
            morph_id = request.morph_id
            # Find the attributeNode id by node_id and attr_name
            registry = dal.load_registry(user_id, "attribute")
            attr_id = None
            for k, v in registry.items():
                if v.get("source_id") == node_id and v.get("name") == attr_name:
                    attr_id = k
                    break
            
            if not attr_id:
                raise HTTPException(status_code=404, detail="Attribute not found")
            
            # Load the source node
            source_node = dal.read_node(user_id, node_id)
            
            # Ensure morphs array exists
            if "morphs" not in source_node:
                source_node["morphs"] = []
            
            # Find the target morph
            target_morph = None
            for morph in source_node["morphs"]:
                if morph.get("morph_id") == morph_id:
                    target_morph = morph
                    break
            
            if not target_morph:
                raise HTTPException(status_code=404, detail="Target morph not found")
            
            # Ensure attributeNode_ids array exists
            if "attributeNode_ids" not in target_morph:
                target_morph["attributeNode_ids"] = []
            
            # Add attribute to the morph if not already present
            if attr_id not in target_morph["attributeNode_ids"]:
                target_morph["attributeNode_ids"].append(attr_id)
                
                # Atomically save the updated node
                dal.update_node(user_id, node_id, source_node)
                
                # Regenerate composed files
                try:
                    node_ids = get_graph_node_ids(user_id, graph_id)
                    metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                    graph_description = ""
                    if metadata_path.exists():
                        import yaml
                        with open(metadata_path, "r") as f:
                            metadata = yaml.safe_load(f) or {}
                            graph_description = metadata.get("description", "")
                    
                    composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                    if composed_data:
                        atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                        atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                        atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
                except Exception as e:
                    print(f"Warning: Failed to regenerate composed files: {e}")
                
                return {"status": "Attribute copied to morph", "attribute_id": attr_id, "morph_id": morph_id}
            else:
                return {"status": "Attribute already exists in target morph", "attribute_id": attr_id, "morph_id": morph_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to copy attribute to morph: {str(e)}")

@router.get("/users/{user_id}/graphs/{graph_id}/attribute/list_by_morph/{node_id}")
def list_attributes_by_morph(user_id: str, graph_id: str, node_id: str):
    """
    List all attributes organized by morph for a given node.
    """
    try:
        # Load source node
        source_node = dal.read_node(user_id, node_id)
        
        # Load attribute registry
        registry = dal.load_registry(user_id, "attribute")
        
        # Organize attributes by morph
        morph_attributes = {}
        for morph in source_node.get("morphs", []):
            morph_id = morph.get("morph_id")
            morph_name = morph.get("name", "Unknown")
            morph_attributes[morph_id] = {
                "morph_id": morph_id,
                "morph_name": morph_name,
                "attributes": []
            }
            
            for attr_id in morph.get("attributeNode_ids", []):
                if attr_id in registry:
                    attr_info = registry[attr_id]
                    
                    # Load full attribute data from the attribute file
                    try:
                        full_attr_data = dal.read_attribute(user_id, attr_id)
                    except FileNotFoundError:
                        full_attr_data = {}
                    
                    # Combine registry info with full attribute data
                    attribute_data = {
                        "attribute_id": attr_id,
                        "name": attr_info.get("name"),
                        "source_id": attr_info.get("source_id"),
                        "value": full_attr_data.get("value"),
                        "unit": full_attr_data.get("unit"),
                        "adverb": full_attr_data.get("adverb"),
                        "modality": full_attr_data.get("modality")
                    }
                    
                    morph_attributes[morph_id]["attributes"].append(attribute_data)
        
        return {"node_id": node_id, "morphs": morph_attributes}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list attributes by morph: {str(e)}")

@router.get("/users/{user_id}/graphs/{graph_id}/relation/list_by_morph/{node_id}")
def list_relations_by_morph(user_id: str, graph_id: str, node_id: str):
    """
    List all relations organized by morph for a given node.
    """
    try:
        # Load source node
        source_node = dal.read_node(user_id, node_id)
        
        # Load relation registry
        registry = dal.load_registry(user_id, "relation")
        
        # Organize relations by morph
        morph_relations = {}
        for morph in source_node.get("morphs", []):
            morph_id = morph.get("morph_id")
            morph_name = morph.get("name", "Unknown")
            morph_relations[morph_id] = {
                "morph_id": morph_id,
                "morph_name": morph_name,
                "relations": []
            }
            
            for rel_id in morph.get("relationNode_ids", []):
                if rel_id in registry:
                    rel_info = registry[rel_id]
                    
                    # Load full relation data from the relation file
                    try:
                        full_rel_data = dal.read_relation(user_id, rel_id)
                    except FileNotFoundError:
                        full_rel_data = {}
                    
                    # Combine registry info with full relation data
                    relation_data = {
                        "relation_id": rel_id,
                        "name": rel_info.get("name"),
                        "source_id": rel_info.get("source_id"),
                        "target_id": rel_info.get("target_id"),
                        "adverb": full_rel_data.get("adverb"),
                        "modality": full_rel_data.get("modality")
                    }
                    
                    morph_relations[morph_id]["relations"].append(relation_data)
        
        return {"node_id": node_id, "morphs": morph_relations}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list relations by morph: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/morph/create")
def create_morph(user_id: str, graph_id: str, request: CreateMorphRequest):
    """
    Create a new morph for a node.
    
    Scenarios:
    1. Empty morph: copy_from_morph is None - creates morph with empty properties
    2. Copy from existing morph: copy_from_morph specifies any existing morph to copy from
    3. Node context is always required - morphs must belong to a node
    """
    try:
        print(f"DEBUG: Morph creation called with:")
        print(f"  user_id: {user_id}")
        print(f"  graph_id: {graph_id}")
        print(f"  node_id: {request.node_id}")
        print(f"  name: {request.name}")
        print(f"  copy_from_morph: {request.copy_from_morph}")
        print(f"  auto-generated morph_id: {request.name}_{request.node_id}")
        
        with graph_transaction(user_id, graph_id, "create_morph") as backup_dir:
            # Auto-generate morph_id from name and node_id
            morph_id = f"{request.name}_{request.node_id}"
            node_id = request.node_id
            morph_name = request.name
            copy_from_morph = request.copy_from_morph
            
            # Load the source node (required context)
            source_node = dal.read_node(user_id, node_id)
            
            # Check if morph already exists
            existing_morph = None
            for morph in source_node.get("morphs", []):
                if morph.get("morph_id") == morph_id:
                    existing_morph = morph
                    break
            
            if existing_morph:
                # Morph already exists, but we need to ensure registries are updated
                print(f"DEBUG: Morph {morph_id} already exists, checking registry updates")
                
                # If copying from another morph, ensure registries are updated
                if copy_from_morph:
                    print(f"DEBUG: Updating registries for existing morph {morph_id}")
                    
                    # Update registries to include the morph_id for all relations and attributes
                    # Update relation registry
                    rel_registry = dal.load_registry(user_id, "relation")
                    for rel_id in existing_morph.get("relationNode_ids", []):
                        if rel_id in rel_registry:
                            current_morph_ids = rel_registry[rel_id].get("morph_id", [])
                            if isinstance(current_morph_ids, str):
                                current_morph_ids = [current_morph_ids]
                            if morph_id not in current_morph_ids:
                                current_morph_ids.append(morph_id)
                                rel_registry[rel_id]["morph_id"] = current_morph_ids
                    dal.save_registry(user_id, "relation", rel_registry)
                    
                    # Update attribute registry
                    attr_registry = dal.load_registry(user_id, "attribute")
                    for attr_id in existing_morph.get("attributeNode_ids", []):
                        if attr_id in attr_registry:
                            current_morph_ids = attr_registry[attr_id].get("morph_id", [])
                            if isinstance(current_morph_ids, str):
                                current_morph_ids = [current_morph_ids]
                            if morph_id not in current_morph_ids:
                                current_morph_ids.append(morph_id)
                                attr_registry[attr_id]["morph_id"] = current_morph_ids
                    dal.save_registry(user_id, "attribute", attr_registry)
                
                # Return success if morph already exists (idempotent behavior)
                return {
                    "status": "Morph already exists",
                    "morph_id": morph_id,
                    "node_id": node_id,
                    "name": morph_name,
                    "copied_from": copy_from_morph,
                    "relation_count": len(existing_morph.get("relationNode_ids", [])),
                    "attribute_count": len(existing_morph.get("attributeNode_ids", []))
                }
            
            # Create new morph
            new_morph = {
                "morph_id": morph_id,
                "node_id": node_id,
                "name": morph_name,
                "relationNode_ids": [],
                "attributeNode_ids": []
            }
            
            # If copying from another morph, copy all properties
            print(f"DEBUG: About to check copy_from_morph condition: {copy_from_morph}")
            print(f"DEBUG: copy_from_morph type: {type(copy_from_morph)}")
            print(f"DEBUG: copy_from_morph truthiness: {bool(copy_from_morph)}")
            if copy_from_morph:
                print(f"DEBUG: Copying from morph: {copy_from_morph}")
                # Reload the node file to ensure latest state
                source_node = dal.read_node(user_id, node_id)
                print(f"DEBUG: Loaded source node with {len(source_node.get('morphs', []))} morphs")
                source_morph = None
                for morph in source_node.get("morphs", []):
                    print(f"DEBUG: Checking morph: {morph.get('morph_id')}")
                    if morph.get("morph_id") == copy_from_morph:
                        source_morph = morph
                        print(f"DEBUG: Found source morph: {copy_from_morph}")
                        break
                
                if not source_morph:
                    print(f"DEBUG: Source morph {copy_from_morph} not found!")
                    raise HTTPException(status_code=404, detail=f"Source morph {copy_from_morph} not found in node {node_id}")
                
                print(f"DEBUG: Copying from source morph {copy_from_morph}")
                print(f"DEBUG: Source morph relationNode_ids: {source_morph.get('relationNode_ids', [])}")
                print(f"DEBUG: Source morph attributeNode_ids: {source_morph.get('attributeNode_ids', [])}")
                
                # Copy relations and attributes
                new_morph["relationNode_ids"] = source_morph.get("relationNode_ids", []).copy()
                new_morph["attributeNode_ids"] = source_morph.get("attributeNode_ids", []).copy()
                
                print(f"DEBUG: New morph relationNode_ids: {new_morph['relationNode_ids']}")
                print(f"DEBUG: New morph attributeNode_ids: {new_morph['attributeNode_ids']}")
                
                # Update registries to include the new morph_id for all copied relations and attributes
                # Update relation registry
                rel_registry = dal.load_registry(user_id, "relation")
                print(f"DEBUG: Current relation registry keys: {list(rel_registry.keys())}")
                for rel_id in new_morph["relationNode_ids"]:
                    print(f"DEBUG: Processing relation {rel_id}")
                    if rel_id in rel_registry:
                        current_morph_ids = rel_registry[rel_id].get("morph_id", [])
                        print(f"DEBUG: Current morph_ids for {rel_id}: {current_morph_ids}")
                        if isinstance(current_morph_ids, str):
                            current_morph_ids = [current_morph_ids]
                        if morph_id not in current_morph_ids:
                            current_morph_ids.append(morph_id)
                        print(f"DEBUG: Updated morph_ids for {rel_id}: {current_morph_ids}")
                        rel_registry[rel_id]["morph_id"] = current_morph_ids
                    else:
                        print(f"DEBUG: Relation {rel_id} not found in registry")
                print(f"DEBUG: Saving updated relation registry")
                dal.save_registry(user_id, "relation", rel_registry)
                
                # Update attribute registry
                attr_registry = dal.load_registry(user_id, "attribute")
                print(f"DEBUG: Current attribute registry keys: {list(attr_registry.keys())}")
                for attr_id in new_morph["attributeNode_ids"]:
                    print(f"DEBUG: Processing attribute {attr_id}")
                    if attr_id in attr_registry:
                        current_morph_ids = attr_registry[attr_id].get("morph_id", [])
                        print(f"DEBUG: Current morph_ids for {attr_id}: {current_morph_ids}")
                        if isinstance(current_morph_ids, str):
                            current_morph_ids = [current_morph_ids]
                        if morph_id not in current_morph_ids:
                            current_morph_ids.append(morph_id)
                        print(f"DEBUG: Updated morph_ids for {attr_id}: {current_morph_ids}")
                        attr_registry[attr_id]["morph_id"] = current_morph_ids
                    else:
                        print(f"DEBUG: Attribute {attr_id} not found in registry")
                print(f"DEBUG: Saving updated attribute registry")
                dal.save_registry(user_id, "attribute", attr_registry)
            
            # Add new morph to node
            if "morphs" not in source_node:
                source_node["morphs"] = []
            source_node["morphs"].append(new_morph)
            
            # Save updated node
            dal.update_node(user_id, node_id, source_node)
            
            return {
                "status": "Morph created successfully",
                "morph_id": morph_id,
                "node_id": node_id,
                "name": morph_name,
                "copied_from": copy_from_morph,
                "relation_count": len(new_morph["relationNode_ids"]),
                "attribute_count": len(new_morph["attributeNode_ids"]),
                "is_empty": copy_from_morph is None
            }
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create morph: {str(e)}")

# --- RelationNode CRUD with legacy route decorators ---

def get_graph_node_ids(user_id: str, graph_id: str) -> list[str]:
    """Get list of node IDs that belong to a specific graph"""
    from backend.core.registry import load_node_registry
    registry = load_node_registry(user_id)
    graph_nodes = []
    
    for node_id, entry in registry.items():
        if "graphs" in entry and graph_id in entry["graphs"]:
            graph_nodes.append(node_id)
    
    return graph_nodes

@router.get("/users/{user_id}/graphs/{graph_id}/relationNodes/{relation_id}")
def get_relation_node(user_id: str, graph_id: str, relation_id: str):
    """Get a specific relation node by its ID"""
    try:
        return dal.read_relation(user_id, relation_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="RelationNode not found")

@router.post("/users/{user_id}/graphs/{graph_id}/relation/create")
async def create_relation_node(
    user_id: str, 
    graph_id: str, 
    rel: RelationNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create relation: Access denied. You can only access your own data."
        )
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "create_relation_node") as backup_dir:
            # Validate required fields
            if not rel.source_id or rel.source_id is None:
                raise HTTPException(status_code=400, detail="source_id is required and cannot be null")
            if not rel.name or rel.name is None:
                raise HTTPException(status_code=400, detail="name is required and cannot be null")
            if not rel.target_id or rel.target_id is None:
                raise HTTPException(status_code=400, detail="target_id is required and cannot be null")
            
            # ATOMICITY FIX: Ensure target node exists before creating relation
            try:
                dal.read_node(user_id, rel.target_id)
            except FileNotFoundError:
                # Create target node atomically within the same transaction
                target_node_data = {
                    "id": rel.target_id,
                    "name": rel.target_id,
                    "base_name": rel.target_id,
                    "adjective": None,
                    "quantifier": None,
                    "role": "individual",
                    "description": "",
                    "morphs": [],
                    "nbh": None
                }
                dal.create_node(user_id, rel.target_id, target_node_data)
                
                # Update node registry to include the new target node
                node_registry = dal.load_registry(user_id, "node")
                node_registry[rel.target_id] = {
                    "id": rel.target_id,
                    "name": rel.target_id,
                    "graphs": [graph_id],
                    "created_at": datetime.utcnow().isoformat()
                }
                dal.save_registry(user_id, "node", node_registry)
            
            rel.id = make_relation_id(rel.source_id, rel.name, rel.target_id, rel.adverb or "", rel.modality or "")
            
            # Validate that the generated ID is not None or empty
            if not rel.id:
                raise HTTPException(status_code=500, detail="Failed to generate valid relation ID")
            
            # Check if relation already exists
            try:
                existing_rel = dal.read_relation(user_id, rel.id)
                morph_id = getattr(rel, 'morph_id', None)
                if not morph_id:
                    # No morph_id provided, fallback to basic morph
                    morph_id = f"basic_{rel.source_id}"
                
                # Extract the first morph_id for string operations
                morph_id_str = morph_id[0] if isinstance(morph_id, list) else morph_id
                
                # Update the relation with the correct morph_id
                existing_rel["morph_id"] = morph_id
                dal.update_relation(user_id, rel.id, existing_rel)
                
                # Update registry with morph_id
                registry = dal.load_registry(user_id, "relation")
                if rel.id in registry:
                    current_morph_id = registry[rel.id].get("morph_id")
                    if isinstance(current_morph_id, list):
                        if morph_id_str not in current_morph_id:
                            current_morph_id.append(morph_id)
                        registry[rel.id]["morph_id"] = current_morph_id
                    elif isinstance(current_morph_id, str):
                        if current_morph_id == morph_id_str:
                            registry[rel.id]["morph_id"] = [current_morph_id]
                        else:
                            registry[rel.id]["morph_id"] = [current_morph_id, morph_id_str]
                    else:
                        registry[rel.id]["morph_id"] = [morph_id_str]
                else:
                    registry[rel.id] = {
                        "id": rel.id,
                        "name": rel.name,
                        "source_id": rel.source_id,
                        "target_id": rel.target_id,
                        "morph_id": [morph_id_str],
                        "graphs": [graph_id],
                        "created_at": datetime.utcnow().isoformat()
                    }
                dal.save_registry(user_id, "relation", registry)
                
                # CRITICAL: Update source node's morph data to include the new relation
                source_node = dal.read_node(user_id, rel.source_id)
                
                # Ensure morphs array exists
                if "morphs" not in source_node:
                    source_node["morphs"] = []
                
                # Find the correct morph
                target_morph = None
                for morph in source_node["morphs"]:
                    if morph.get("morph_id") == morph_id_str:
                        target_morph = morph
                        break
                
                # If the morph doesn't exist, create it
                if not target_morph:
                    target_morph = {
                        "morph_id": morph_id_str,
                        "node_id": rel.source_id,
                        "name": morph_id_str.replace(f"{rel.source_id}_", ""),
                        "relationNode_ids": [],
                        "attributeNode_ids": []
                    }
                    source_node["morphs"].append(target_morph)
                
                # Add relation to the morph
                if "relationNode_ids" not in target_morph:
                    target_morph["relationNode_ids"] = []
                if rel.id not in target_morph["relationNode_ids"]:
                    target_morph["relationNode_ids"].append(rel.id)
                
                # Set nbh to this morph if not already set
                if not source_node.get("nbh"):
                    source_node["nbh"] = morph_id_str
                
                # Atomically save updated source node
                dal.update_node(user_id, rel.source_id, source_node)
                
                return {
                    "status": "RelationNode created successfully",
                    "relation_id": rel.id,
                    "morph_id": morph_id_str
                }
            except FileNotFoundError:
                # Relation does not exist, so create it
                pass
            
            # If relation doesn't exist, create it
            # Determine morph_id - use provided or default to basic
            morph_id = getattr(rel, 'morph_id', None)
            if not morph_id:
                morph_id = f"basic_{rel.source_id}"
            
            # Set the morph_id in the relation (ensure it's a list)
            rel.morph_id = [morph_id] if isinstance(morph_id, str) else morph_id
            
            # Extract the first morph_id for string operations
            morph_id_str = morph_id[0] if isinstance(morph_id, list) else morph_id
            
            # Atomically save relation file
            dal.create_relation(user_id, rel.id, rel.dict())
            
            # Load and update registry atomically
            registry = dal.load_registry(user_id, "relation")
            entry = registry.get(rel.id)
            if entry:
                # Ensure morph_id is a list
                current_morph_id = entry.get("morph_id")
                if isinstance(current_morph_id, list):
                    if morph_id not in current_morph_id:
                        current_morph_id.append(morph_id)
                    entry["morph_id"] = current_morph_id
                elif isinstance(current_morph_id, str):
                    if current_morph_id == morph_id:
                        entry["morph_id"] = [morph_id]
                    else:
                        entry["morph_id"] = [current_morph_id, morph_id]
                else:
                    entry["morph_id"] = [morph_id]
            else:
                entry = {
                    "id": rel.id,
                    "name": rel.name,
                    "source_id": rel.source_id,
                    "target_id": rel.target_id,
                    "morph_id": [morph_id],
                    "graphs": [graph_id],
                    "created_at": datetime.utcnow().isoformat()
                }
            if graph_id not in entry["graphs"]:
                entry["graphs"].append(graph_id)
            registry[rel.id] = entry
            dal.save_registry(user_id, "relation", registry)
            
            # CRITICAL: Update source node's morph data to include the new relation
            source_node = dal.read_node(user_id, rel.source_id)
            
            # Ensure morphs array exists
            if "morphs" not in source_node:
                source_node["morphs"] = []
            
            # Find the correct morph
            target_morph = None
            for morph in source_node["morphs"]:
                if morph.get("morph_id") == morph_id_str:
                    target_morph = morph
                    break
            
            # If the morph doesn't exist, create it
            if not target_morph:
                target_morph = {
                    "morph_id": morph_id_str,
                    "node_id": rel.source_id,
                    "name": morph_id_str.replace(f"{rel.source_id}_", ""),
                    "relationNode_ids": [],
                    "attributeNode_ids": []
                }
                source_node["morphs"].append(target_morph)
            
            # Add relation to the morph
            if "relationNode_ids" not in target_morph:
                target_morph["relationNode_ids"] = []
            if rel.id not in target_morph["relationNode_ids"]:
                target_morph["relationNode_ids"].append(rel.id)
            
            # Set nbh to this morph if not already set
            if not source_node.get("nbh"):
                source_node["nbh"] = morph_id_str
            
            # Atomically save updated source node
            dal.update_node(user_id, rel.source_id, source_node)
            
            # Regenerate composed files
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {
                "status": "RelationNode created successfully",
                "relation_id": rel.id,
                "morph_id": morph_id_str
            }
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create relation: {str(e)}")

@router.delete("/users/{user_id}/graphs/{graph_id}/relation/delete/{source}/{name}/{target}")
async def delete_relation(
    user_id: str, 
    graph_id: str, 
    source: str, 
    name: str, 
    target: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete relation: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    """Delete a relation by source, name, and target"""
    try:
        with graph_transaction(user_id, graph_id, "delete_relation") as backup_dir:
            # Find the relation ID by source, name, and target
            registry = dal.load_registry(user_id, "relation")
            rel_id = None
            for k, v in registry.items():
                if (v.get("source_id") == source and 
                    v.get("name") == name and 
                    v.get("target_id") == target):
                    rel_id = k
                    break
            
            if not rel_id:
                raise HTTPException(status_code=404, detail="Relation not found")
            
            # Remove the relation file atomically
            dal.delete_relation(user_id, rel_id)
            
            # Update registry atomically
            if rel_id in registry:
                del registry[rel_id]
                dal.save_registry(user_id, "relation", registry)
            
            # Update source node's morphs to remove this relation atomically
            source_node = dal.read_node(user_id, source)
            
            # Remove from all morphs
            if "morphs" in source_node:
                for morph in source_node["morphs"]:
                    if "relationNode_ids" in morph and rel_id in morph["relationNode_ids"]:
                        morph["relationNode_ids"].remove(rel_id)
            
            # Atomically save updated source node
            dal.update_node(user_id, source, source_node)
            
            # Regenerate composed files atomically
            try:
                node_ids = get_graph_node_ids(user_id, graph_id)
                metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
                graph_description = ""
                if metadata_path.exists():
                    import yaml
                    with open(metadata_path, "r") as f:
                        metadata = yaml.safe_load(f) or {}
                        graph_description = metadata.get("description", "")
                
                composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            except Exception as e:
                print(f"Warning: Failed to regenerate composed files: {e}")
            
            return {"status": "Relation deleted and registry updated"}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete relation: {str(e)}")

# ---------- Data Consistency and Validation Endpoints ----------

@router.get("/users/{user_id}/graphs/{graph_id}/validate")
def validate_graph_consistency(user_id: str, graph_id: str):
    """
    Validate the consistency of a graph's data.
    
    This endpoint performs comprehensive validation of:
    - Node registry consistency
    - Relation registry consistency  
    - Attribute registry consistency
    - File existence checks
    - Reference integrity
    
    Returns validation results with issues and warnings.
    """
    try:
        validation_result = validate_consistency(user_id)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/cleanup-backups")
def cleanup_old_backups(user_id: str, graph_id: str, max_age_hours: int = 24):
    """
    Clean up old backup directories for a user.
    
    Args:
        user_id: User ID
        graph_id: Graph ID (not used but kept for consistency)
        max_age_hours: Maximum age of backups to keep (default: 24 hours)
    
    Returns:
        Number of backups cleaned up
    """
    try:
        cleaned_count = cleanup_backups(user_id, max_age_hours)
        return {
            "status": "Backup cleanup completed",
            "cleaned_count": cleaned_count,
            "max_age_hours": max_age_hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup cleanup failed: {str(e)}")





