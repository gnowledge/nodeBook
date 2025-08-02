from fastapi import APIRouter, Request, HTTPException, Body, Depends
from fastapi.responses import PlainTextResponse, FileResponse, JSONResponse
from pydantic import BaseModel, model_validator
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from shutil import copyfile, rmtree
import yaml
import json
from os.path import getmtime
import shutil

try:
    from backend.config import get_data_root
except ImportError:
    from backend.config import get_data_root

from backend.core.clean_cnl_payload import clean_cnl_payload
from backend.core.path_utils import get_graph_path
from backend.core.schema_ops import create_attribute_type_from_dict, create_relation_type_from_dict, load_schema
from backend.core.ndf_ops import convert_parsed_to_nodes
from backend.core.schema_utils import filter_used_schema
from backend.core.utils import load_json_file, save_json_file, normalize_id
from backend.core.cnl_parser import parse_node_title
from backend.core.registry import create_node_if_missing, load_node_registry, update_node_registry, save_node_registry
from backend.core.compose import compose_graph
from backend.core.node_ops import load_node
from backend.core.atomic_ops import (
    save_json_file_atomic,
    load_json_file,
    graph_transaction,
    AtomicityError,
    atomic_registry_save,
    atomic_node_save,
    atomic_composed_save
)
from backend.routes.users import current_active_user, User
from backend.core import dal


router = APIRouter()  # All routes prefixed with /api/ndf


def ensure_all_nodes_exist(user_id: str, graph_id: str, parsed: dict):
    """
    Ensure that all nodes referenced in parsed["relations"] and parsed["attributes"] exist in registry and nodes/<id>.json
    """
    registry = dal.load_registry(user_id, "node")
    known = {node["id"] for node in parsed["nodes"] if isinstance(node, dict)}
    inferred = set()

    for rel in parsed.get("relations", []):
        inferred.add(normalize_id(rel.get("target")))
    for attr in parsed.get("attributes", []):
        inferred.add(normalize_id(attr.get("target")))

    for nid in inferred:
        if nid not in known:
            try:
                create_node_if_missing(user_id, nid, name=nid.capitalize())
                update_node_registry(registry, nid, graph_id)
                parsed["nodes"].append(nid)
            except Exception:
                pass

    # Use get_data_root() for registry path
    dal.save_registry(user_id, "node", registry)


@router.get("/users/{user_id}/graphs/{graph_id}/preview")
def get_composed_yaml_for_preview(user_id: str, graph_id: str):
    """
    Returns composed.yaml for preview rendering in NDFPreview (readonly).
    """
    try:
        data = dal.read_composed(user_id, graph_id, "json")
        yaml_text = yaml.dump(data, sort_keys=False, allow_unicode=True)
        return PlainTextResponse(content=yaml_text, media_type="text/plain")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="composed.json not found")


@router.put("/users/{user_id}/graphs/{graph_id}/cnl")
def save_cnl(user_id: str, graph_id: str, body: str = Body(..., media_type="text/plain"), user: User = Depends(current_active_user)):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot access graph: Access denied. You can only access your own data."
        )
    
    try:
        with graph_transaction(user_id, graph_id, "save_cnl") as backup_dir:
            cleaned = clean_cnl_payload(body)
            dal.save_cnl(user_id, graph_id, cleaned)
            
            return {"status": "ok"}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save CNL: {str(e)}")


@router.get("/users/{user_id}/graphs/{graph_id}/parsed")
async def get_parsed_yaml(user_id: str, graph_id: str):
    try:
        return dal.read_parsed(user_id, graph_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="parsed.yaml not found")


@router.get("/users/{user_id}/graphs/{graph_id}/composed")
def get_composed_json(user_id: str, graph_id: str):
    """
    Returns the composed.json for use by the frontend as structured graph data.
    """
    try:
        return dal.read_composed(user_id, graph_id, "json")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="composed.json not found")


@router.get("/users/{user_id}/graphs/{graph_id}/polymorphic_composed")
def get_polymorphic_composed_json(user_id: str, graph_id: str):
    """
    Returns the polymorphic_composed.json for use by the frontend with rich node data.
    """
    try:
        return dal.read_composed(user_id, graph_id, "polymorphic")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="polymorphic_composed.json not found")


@router.get("/users/{user_id}/graphs/{graph_id}/composed.yaml")
async def get_composed_yaml(user_id: str, graph_id: str):
    try:
        data = dal.read_composed(user_id, graph_id, "json")
        yaml_text = yaml.dump(data, sort_keys=False, allow_unicode=True)
        return PlainTextResponse(content=yaml_text, media_type="text/plain")
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="composed.json not found")


@router.get("/users/{user_id}/graphs")
def list_graphs(user_id: str):
    return dal.list_graphs(user_id)


@router.get("/users/{user_id}/graphs/{graph_id}/cnl")
def get_cnl_block(user_id: str, graph_id: str):
    try:
        return dal.read_cnl(user_id, graph_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="CNL.md not found")


@router.get("/users/{user_id}/graphs/{graph_id}/raw")
async def get_graph_raw(user_id: str, graph_id: str):
    try:
        return dal.read_cnl(user_id, graph_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="CNL.md not found")


class GraphInitRequest(BaseModel):
    title: str
    description: str = ""


@router.post("/users/{user_id}/graphs/{graph_id}")
async def create_graph(user_id: str, graph_id: str, req: GraphInitRequest, user: User = Depends(current_active_user)):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create graph: Access denied. You can only access your own data."
        )
    
    try:
        with graph_transaction(user_id, graph_id, "create_graph") as backup_dir:
            dal.create_graph(user_id, graph_id, req.title, req.description)
            return {"status": "created", "graph": graph_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating graph: {e}")


@router.get("/users/{user_id}/graphs/{graph_id}/metadata.yaml")
def get_metadata_yaml(user_id: str, graph_id: str):
    try:
        return dal.read_metadata(user_id, graph_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="metadata.yaml not found")


def migrate_registries_to_include_graphs(user_id: str, graph_id: str):
    """
    Migrate existing relation and attribute registries to include graphs field.
    This ensures backward compatibility with existing data.
    """
    # Migrate relation registry atomically
    relation_registry = dal.load_registry(user_id, "relation")
    relation_changed = False
    for rel_id, entry in relation_registry.items():
        if "graphs" not in entry:
            entry["graphs"] = [graph_id]  # Assume it belongs to the current graph
            relation_changed = True
    if relation_changed:
        dal.save_registry(user_id, "relation", relation_registry)
    
    # Migrate attribute registry atomically
    attribute_registry = dal.load_registry(user_id, "attribute")
    attribute_changed = False
    for attr_id, entry in attribute_registry.items():
        if "graphs" not in entry:
            entry["graphs"] = [graph_id]  # Assume it belongs to the current graph
            attribute_changed = True
    if attribute_changed:
        dal.save_registry(user_id, "attribute", attribute_registry)


@router.delete("/users/{user_id}/graphs/{graph_id}")
def delete_graph(user_id: str, graph_id: str, user: User = Depends(current_active_user)):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete graph: Access denied. You can only access your own data."
        )
    
    """
    Delete a graph: removes the graph directory, updates node_registry.json, and deletes orphaned nodes.
    Also cleans up relationNodes and attributeNodes that belong only to this graph.
    """
    try:
        with graph_transaction(user_id, graph_id, "delete_graph") as backup_dir:
            dal.delete_graph(user_id, graph_id)
            return JSONResponse({"status": "deleted", "graph": graph_id})
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete graph: {str(e)}")


@router.delete("/users/{user_id}/graphs/{graph_id}/delete")
def delete_graph_with_delete_path(user_id: str, graph_id: str, user: User = Depends(current_active_user)):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete graph: Access denied. You can only access your own data."
        )
    
    """
    Delete a graph: removes the graph directory, updates node_registry.json, and deletes orphaned nodes.
    This endpoint matches the frontend's expected URL pattern.
    """
    # Delegate to the main delete_graph function
    return delete_graph(user_id, graph_id, user)


class AddNodeToGraphRequest(BaseModel):
    node_ids: list[str]

@router.post("/users/{user_id}/graphs/{graph_id}/add_nodes")
def add_nodes_to_graph(user_id: str, graph_id: str, req: AddNodeToGraphRequest):
    """
    Add existing nodes to a graph. This updates the node registry and recomposes the graph.
    """
    try:
        with graph_transaction(user_id, graph_id, "add_nodes_to_graph") as backup_dir:
            dal.add_nodes_to_graph(user_id, graph_id, req.node_ids)
            return {"status": "success", "message": f"Added {len(req.node_ids)} nodes to graph"}
                
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add nodes to graph: {str(e)}")

@router.get("/users/{user_id}/nodes")
def list_user_nodes(user_id: str):
    """
    List all nodes available to a user (from their global node space).
    """
    return dal.list_user_nodes(user_id)

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
def list_graph_nodes(user_id: str, graph_id: str):
    """
    List all nodes that belong to a specific graph.
    """
    return dal.list_graph_nodes(user_id, graph_id)

@router.get("/users/{user_id}/graphs/{graph_id}/cnl_md")
async def get_cnl_md(user_id: str, graph_id: str):
    """
    Generate and return CNL.md content from polymorphic_composed.json.
    This creates a read-only educational file showing CNL examples.
    """
    try:
        return dal.get_cnl_md(user_id, graph_id)
    except FileNotFoundError:
        # Return a basic CNL guide if no data exists
        basic_cnl = """# CNL (Controlled Natural Language) Guide

This file shows examples of how to write CNL based on your graph structure.

## Basic Syntax

### Relations
```
<relation_name> target_node
```

### Attributes
```
has attribute_name: value
```

### Examples
```
heart <pumps> blood
heart has color: red
```

*This file will be populated with examples from your graph data.*"""
        return PlainTextResponse(content=basic_cnl, media_type="text/markdown")

@router.put("/users/{user_id}/graphs/{graph_id}/cnl_md")
async def update_cnl_md(user_id: str, graph_id: str, request: Request):
    """
    Update CNL.md content (for advanced/expert users only).
    This endpoint is restricted based on user difficulty level.
    """
    try:
        # Check user difficulty level
        prefs = dal.read_preferences(user_id)
        difficulty = prefs.get("difficulty", "easy")
        
        # Only allow editing for advanced and expert users
        if difficulty not in ["advanced", "expert"]:
            raise HTTPException(
                status_code=403, 
                detail="CNL editing is only available for Advanced and Expert difficulty levels"
            )
        
        # Get the CNL content from request body
        cnl_content = await request.body()
        cnl_text = cnl_content.decode('utf-8')
        
        # Save the updated CNL.md file
        dal.save_cnl(user_id, graph_id, cnl_text)
        
        return {"message": "CNL.md updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update CNL.md: {str(e)}")

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/cnl")
async def update_node_cnl(user_id: str, graph_id: str, node_id: str, request: Request):
    """
    Update CNL for a specific node's neighborhood (for advanced/expert users only).
    This endpoint parses CNL and updates the node's neighborhood data.
    """
    try:
        # Check user difficulty level
        prefs = dal.read_preferences(user_id)
        difficulty = prefs.get("difficulty", "easy")
        
        # Only allow editing for advanced and expert users
        if difficulty not in ["advanced", "expert"]:
            raise HTTPException(
                status_code=403, 
                detail="CNL editing is only available for Advanced and Expert difficulty levels"
            )
        
        # Get the CNL content from request body
        cnl_content = await request.body()
        cnl_text = cnl_content.decode('utf-8')
        
        # Parse the CNL text
        from backend.core.cnl_parser import parse_logical_cnl
        parsed_facts = parse_logical_cnl(cnl_text, subject=node_id)
        
        if not parsed_facts:
            raise HTTPException(status_code=400, detail="No valid CNL statements found")
        
        # Load the node data
        node_data = dal.read_node(user_id, node_id)
        
        # Update node with parsed CNL data
        # This is a simplified implementation - in a full system, you'd want to
        # properly merge the CNL data with existing node structure
        node_data["cnl"] = cnl_text
        node_data["parsed_cnl"] = parsed_facts
        
        # Save the updated node
        dal.update_node(user_id, node_id, node_data)
        
        # Regenerate composed files
        try:
            from backend.core.compose import compose_graph
            # Get the list of nodes in this graph
            graph_nodes = dal.list_graph_nodes(user_id, graph_id)
            
            if graph_nodes:
                compose_graph(user_id, graph_id, graph_nodes)
        except Exception as e:
            print(f"Warning: Failed to regenerate composed files: {e}")
        
        return {"message": "Node CNL updated successfully", "parsed_facts": parsed_facts}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update node CNL: {str(e)}")
