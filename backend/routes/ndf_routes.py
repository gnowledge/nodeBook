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
    from config import get_data_root

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
    graph_transaction, 
    AtomicityError, 
    save_json_file_atomic, 
    atomic_registry_save,
    atomic_composed_save
)
from backend.routes.users import current_active_user, User


router = APIRouter()  # All routes prefixed with /api/ndf


def ensure_all_nodes_exist(user_id: str, graph_id: str, parsed: dict):
    """
    Ensure that all nodes referenced in parsed["relations"] and parsed["attributes"] exist in registry and nodes/<id>.json
    """
    registry = load_node_registry(user_id)
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
    save_json_file(get_data_root() / "users" / user_id / "node_registry.json", registry)


@router.get("/users/{user_id}/graphs/{graph_id}/preview")
def get_composed_yaml_for_preview(user_id: str, graph_id: str):
    """
    Returns composed.yaml for preview rendering in NDFPreview (readonly).
    """
    composed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "composed.json"
    if not composed_path.exists():
        raise HTTPException(status_code=404, detail="composed.json not found")

    data = load_json_file(composed_path)
    yaml_text = yaml.dump(data, sort_keys=False, allow_unicode=True)
    return PlainTextResponse(content=yaml_text, media_type="text/plain")


@router.put("/users/{user_id}/graphs/{graph_id}/cnl")
def save_cnl(user_id: str, graph_id: str, body: str = Body(..., media_type="text/plain")):
    try:
        with graph_transaction(user_id, graph_id, "save_cnl") as backup_dir:
            cleaned = clean_cnl_payload(body)
            cnl_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "cnl.md"
            
            # Atomically save CNL file
            cnl_path.write_text(cleaned, encoding="utf-8")
            
            return {"status": "ok"}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save CNL: {str(e)}")


@router.get("/users/{user_id}/graphs/{graph_id}/parsed")
async def get_parsed_yaml(user_id: str, graph_id: str):
    parsed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "parsed.yaml"
    if not parsed_path.exists():
        raise HTTPException(status_code=404, detail="parsed.yaml not found")

    return FileResponse(parsed_path, media_type="text/plain")


@router.get("/users/{user_id}/graphs/{graph_id}/composed")
def get_composed_json(user_id: str, graph_id: str):
    """
    Returns the composed.json for use by the frontend as structured graph data.
    """
    composed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "composed.json"
    if not composed_path.exists():
        raise HTTPException(status_code=404, detail="composed.json not found")

    return load_json_file(composed_path)


@router.get("/users/{user_id}/graphs/{graph_id}/polymorphic_composed")
def get_polymorphic_composed_json(user_id: str, graph_id: str):
    """
    Returns the polymorphic_composed.json for use by the frontend with rich node data.
    """
    poly_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "polymorphic_composed.json"
    if not poly_path.exists():
        raise HTTPException(status_code=404, detail="polymorphic_composed.json not found")

    return load_json_file(poly_path)


@router.get("/users/{user_id}/graphs/{graph_id}/composed.yaml")
async def get_composed_yaml(user_id: str, graph_id: str):
    composed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "composed.json"
    if not composed_path.exists():
        raise HTTPException(status_code=404, detail="composed.json not found")

    data = load_json_file(composed_path)
    yaml_text = yaml.dump(data, sort_keys=False, allow_unicode=True)
    return PlainTextResponse(content=yaml_text, media_type="text/plain")


@router.get("/users/{user_id}/graphs")
def list_graphs(user_id: str):
    base_dir = get_data_root() / "users" / user_id / "graphs"
    if not base_dir.exists():
        return []
    return [f.name for f in base_dir.iterdir() if f.is_dir()]


@router.get("/users/{user_id}/graphs/{graph_id}/cnl")
def get_cnl_block(user_id: str, graph_id: str):
    cnl_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "cnl.md"
    if not cnl_path.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")
    return cnl_path.read_text()


@router.get("/users/{user_id}/graphs/{graph_id}/raw")
async def get_graph_raw(user_id: str, graph_id: str):
    graph_file = get_data_root() / "users" / user_id / "graphs" / graph_id / "cnl.md"
    if not graph_file.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")
    return graph_file.read_text()


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
            graph_dir = get_data_root() / "users" / user_id / "graphs" / graph_id
            template_dir = Path("graph_data/global/templates/defaultGraphFiles")

            if graph_dir.exists():
                raise HTTPException(status_code=400, detail="Graph already exists")

            # Create graph directory
            graph_dir.mkdir(parents=True)

            # Copy template files atomically
            for fname in ["cnl.md", "composed.json", "composed.yaml", "metadata.yaml"]:
                src = template_dir / fname
                dest = graph_dir / fname
                if not src.exists():
                    raise HTTPException(status_code=500, detail=f"Template file missing: {fname}")
                copyfile(src, dest)

            # Update metadata atomically
            metadata_path = graph_dir / "metadata.yaml"
            if metadata_path.exists():
                metadata = yaml.safe_load(metadata_path.read_text()) or {}
                metadata["title"] = req.title
                metadata["description"] = req.description
                timestamp = datetime.utcnow().isoformat()
                metadata["created"] = metadata.get("created", timestamp)
                metadata["modified"] = timestamp
                
                # Atomically save metadata
                with metadata_path.open("w") as f:
                    yaml.dump(metadata, f, sort_keys=False)

            return {"status": "created", "graph": graph_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating graph: {e}")


@router.get("/users/{user_id}/graphs/{graph_id}/metadata.yaml")
def get_metadata_yaml(user_id: str, graph_id: str):
    metadata_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "metadata.yaml"
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="metadata.yaml not found")
    return FileResponse(metadata_path, media_type="text/plain")


def migrate_registries_to_include_graphs(user_id: str, graph_id: str):
    """
    Migrate existing relation and attribute registries to include graphs field.
    This ensures backward compatibility with existing data.
    """
    # Migrate relation registry atomically
    relation_registry_path = get_data_root() / "users" / user_id / "relation_registry.json"
    if relation_registry_path.exists():
        relation_registry = load_json_file(relation_registry_path)
        relation_changed = False
        for rel_id, entry in relation_registry.items():
            if "graphs" not in entry:
                entry["graphs"] = [graph_id]  # Assume it belongs to the current graph
                relation_changed = True
        if relation_changed:
            atomic_registry_save(user_id, "relation", relation_registry)
    
    # Migrate attribute registry atomically
    attribute_registry_path = get_data_root() / "users" / user_id / "attribute_registry.json"
    if attribute_registry_path.exists():
        attribute_registry = load_json_file(attribute_registry_path)
        attribute_changed = False
        for attr_id, entry in attribute_registry.items():
            if "graphs" not in entry:
                entry["graphs"] = [graph_id]  # Assume it belongs to the current graph
                attribute_changed = True
        if attribute_changed:
            atomic_registry_save(user_id, "attribute", attribute_registry)


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
            graph_dir = get_data_root() / "users" / user_id / "graphs" / graph_id
            registry_path = get_data_root() / "users" / user_id / "node_registry.json"
            node_dir = get_data_root() / "users" / user_id / "nodes"
            relation_dir = get_data_root() / "users" / user_id / "relationNodes"
            attribute_dir = get_data_root() / "users" / user_id / "attributeNodes"

            if not graph_dir.exists():
                raise HTTPException(status_code=404, detail="Graph not found")

            # Migrate existing registries to include graphs field for backward compatibility
            migrate_registries_to_include_graphs(user_id, graph_id)

            # 1. Remove the graph directory
            try:
                shutil.rmtree(graph_dir)
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to delete graph directory: {e}")

            # 2. Update node_registry.json to remove references to this graph atomically
            registry = load_node_registry(user_id)
            changed = False
            for node_id, entry in list(registry.items()):
                if "graphs" in entry and graph_id in entry["graphs"]:
                    entry["graphs"].remove(graph_id)
                    changed = True
                # 3. If node is now orphaned (no graphs), delete node file and remove from registry
                if not entry.get("graphs"):
                    try:
                        node_path = node_dir / f"{node_id}.json"
                        if node_path.exists():
                            node_path.unlink()
                    except Exception:
                        pass  # Ignore if already deleted
                    del registry[node_id]
                    changed = True
            if changed:
                atomic_registry_save(user_id, "node", registry)

            # 4. Clean up relationNodes that belong only to this graph atomically
            relation_registry_path = get_data_root() / "users" / user_id / "relation_registry.json"
            if relation_registry_path.exists():
                relation_registry = load_json_file(relation_registry_path)
                relation_changed = False
                for rel_id, entry in list(relation_registry.items()):
                    if "graphs" in entry and graph_id in entry["graphs"]:
                        entry["graphs"].remove(graph_id)
                        # If relation is now orphaned (no graphs), delete it
                        if not entry["graphs"]:
                            try:
                                rel_path = relation_dir / f"{rel_id}.json"
                                if rel_path.exists():
                                    rel_path.unlink()
                            except Exception:
                                pass  # Ignore if already deleted
                            del relation_registry[rel_id]
                        relation_changed = True
                if relation_changed:
                    atomic_registry_save(user_id, "relation", relation_registry)

            # 5. Clean up attributeNodes that belong only to this graph atomically
            attribute_registry_path = get_data_root() / "users" / user_id / "attribute_registry.json"
            if attribute_registry_path.exists():
                attribute_registry = load_json_file(attribute_registry_path)
                attribute_changed = False
                for attr_id, entry in list(attribute_registry.items()):
                    if "graphs" in entry and graph_id in entry["graphs"]:
                        entry["graphs"].remove(graph_id)
                        # If attribute is now orphaned (no graphs), delete it
                        if not entry["graphs"]:
                            try:
                                attr_path = attribute_dir / f"{attr_id}.json"
                                if attr_path.exists():
                                    attr_path.unlink()
                            except Exception:
                                pass  # Ignore if already deleted
                            del attribute_registry[attr_id]
                        attribute_changed = True
                if attribute_changed:
                    atomic_registry_save(user_id, "attribute", attribute_registry)

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
            # Check if graph exists
            graph_dir = get_data_root() / "users" / user_id / "graphs" / graph_id
            if not graph_dir.exists():
                raise HTTPException(status_code=404, detail="Graph not found")
            
            # Load current node registry
            registry = load_node_registry(user_id)
            
            # Validate that all nodes exist
            missing_nodes = []
            for node_id in req.node_ids:
                node_path = get_data_root() / "users" / user_id / "nodes" / f"{node_id}.json"
                if not node_path.exists():
                    missing_nodes.append(node_id)
            
            if missing_nodes:
                raise HTTPException(status_code=404, detail=f"Nodes not found: {missing_nodes}")
            
            # Update registry to add nodes to this graph atomically
            for node_id in req.node_ids:
                update_node_registry(registry, node_id, graph_id)
            
            # Atomically save updated registry
            atomic_registry_save(user_id, "node", registry)
            
            # Get all nodes that belong to this graph
            graph_nodes = []
            for node_id, entry in registry.items():
                if "graphs" in entry and graph_id in entry["graphs"]:
                    graph_nodes.append(node_id)
            
            # Recompose the graph atomically
            try:
                # Load graph description
                metadata_path = graph_dir / "metadata.yaml"
                graph_description = ""
                if metadata_path.exists():
                    metadata = yaml.safe_load(metadata_path.read_text()) or {}
                    graph_description = metadata.get("description", "")
                
                # Compose the graph with all nodes atomically
                composed_data = compose_graph(user_id, graph_id, graph_nodes, graph_description)
                if composed_data:
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                    atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                    atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
                
                return {
                    "status": "success",
                    "message": f"Added {len(req.node_ids)} nodes to graph",
                    "graph_nodes": graph_nodes
                }
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Failed to recompose graph: {e}")
                
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add nodes to graph: {str(e)}")

@router.get("/users/{user_id}/nodes")
def list_user_nodes(user_id: str):
    """
    List all nodes available to a user (from their global node space).
    """
    registry = load_node_registry(user_id)
    nodes = []
    
    for node_id, entry in registry.items():
        node_path = get_data_root() / "users" / user_id / "nodes" / f"{node_id}.json"
        if node_path.exists():
            try:
                node_data = load_json_file(node_path)
                nodes.append({
                    "id": node_id,
                    "name": entry.get("name", node_id),
                    "role": entry.get("role", "individual"),
                    "graphs": entry.get("graphs", []),
                    "description": node_data.get("description", ""),
                    "created_at": entry.get("created_at"),
                    "updated_at": entry.get("updated_at")
                })
            except Exception:
                # Skip nodes that can't be loaded
                continue
    
    return nodes

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
def list_graph_nodes(user_id: str, graph_id: str):
    """
    List all nodes that belong to a specific graph.
    """
    registry = load_node_registry(user_id)
    graph_nodes = []
    
    for node_id, entry in registry.items():
        if "graphs" in entry and graph_id in entry["graphs"]:
            node_path = get_data_root() / "users" / user_id / "nodes" / f"{node_id}.json"
            if node_path.exists():
                try:
                    node_data = load_json_file(node_path)
                    graph_nodes.append({
                        "id": node_id,
                        "name": entry.get("name", node_id),
                        "role": entry.get("role", "individual"),
                        "description": node_data.get("description", ""),
                        "created_at": entry.get("created_at"),
                        "updated_at": entry.get("updated_at")
                    })
                except Exception:
                    # Skip nodes that can't be loaded
                    continue
    
    return graph_nodes
