from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
from pathlib import Path
from backend.core.node_ops import load_node, save_node, node_path, safe_node_summary
from backend.core.id_utils import normalize_id, get_graph_path, get_user_id
from backend.summary_queue_singleton import init_summary_queue
import json
import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Literal
import os
from pathlib import Path
from backend.core.node_ops import load_node, save_node, node_path, safe_node_summary
from backend.core.id_utils import normalize_id, get_graph_path, get_user_id
from backend.summary_queue_singleton import init_summary_queue
import json
import time
from backend.core.models import Attribute, Relation, PolyNode, Morph
from backend.core import dal

from backend.core.node_utils import (
    extract_base_name, extract_qualifier, extract_quantifier, compose_node_id, extract_node_name_as_is
)
from backend.core.compose import compose_graph
from backend.core.registry import load_node_registry, make_polynode_id, load_registry, save_registry
from backend.core.atomic_ops import (
    save_json_file_atomic,
    load_json_file,
    graph_transaction,
    AtomicityError,
    atomic_registry_save,
    atomic_node_save,
    atomic_composed_save
)
from backend.core.validation import require_user_and_graph
from backend.routes.users import current_active_user, User
from backend.core.auth_validation import require_self_access_or_superuser, require_graph_exists

router = APIRouter()

class Node(BaseModel):
    id: Optional[str] = None
    name: str
    base_name: Optional[str] = None
    qualifier: Optional[str] = None  # <-- allow any string, not Literal
    role: Optional[Literal["class", "individual", "process"]] = None
    description: Optional[str] = None
    attributes: List[Attribute] = []
    relations: List[Relation] = []

class NodeInput(BaseModel):
    name: str

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
async def list_all_nodes(
    user_id: str, 
    graph_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot list nodes: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    # if not require_graph_exists(user_id, graph_id):
    #     raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    user_id = get_user_id(user_id)
    nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    nodes = []
    if os.path.exists(nodes_dir):
        for file in os.listdir(nodes_dir):
            if file.endswith(".json"):
                node_id = file[:-5]
                summary = safe_node_summary(user_id, graph_id, node_id)
                if summary:
                    nodes.append(summary)
    return nodes

# --- Legacy Node CRUD functions (commented out, kept for reference) ---
# @router.post("/users/{user_id}/graphs/{graph_id}/nodes")
# def create_node(user_id: str, graph_id: str, node: Node):
#     ... (legacy logic)
#
# @router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
# def update_node(user_id: str, graph_id: str, node_id: str, node: Node):
#     ... (legacy logic)
#
# @router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
# def get_node(user_id: str, graph_id: str, node_id: str):
#     ... (legacy logic)
#
# @router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
# def get_node_info(user_id: str, graph_id: str, node_id: str):
#     ... (legacy logic)

# --- PolyNode CRUD with FastAPI Users authentication only ---
@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
async def create_polynode(
    user_id: str, 
    graph_id: str, 
    node: PolyNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "create_polynode") as backup_dir:
            # Compute ID from base_name and other fields (but not morph_name)
            node.id = make_polynode_id(node.quantifier or "", node.adjective or "", "", node.base_name)
            
            # Compute name from base_name and adjective if not provided
            if not node.name:
                if node.adjective:
                    node.name = f"{node.adjective} {node.base_name}"
                else:
                    node.name = node.base_name
            
            # Ensure node has morphs array
            if not node.morphs:
                node.morphs = []
            
            # Create basic morph if it doesn't exist
            basic_morph_exists = any(morph.name == "basic" for morph in node.morphs)
            if not basic_morph_exists:
                from backend.core.models import Morph
                basic_morph = Morph(
                    morph_id=f"basic_{node.id}",
                    node_id=node.id,
                    name="basic",
                    relationNode_ids=[],
                    attributeNode_ids=[]
                )
                node.morphs.append(basic_morph)
                # Set nbh to basic morph
                node.nbh = basic_morph.morph_id
            
            # Check if node already exists in this graph
            node_path = Path(f"graph_data/users/{user_id}/nodes/{node.id}.json")
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            
            # If node exists but is not in this graph, add it to this graph
            if node_path.exists() and node.id in registry:
                if graph_id not in registry[node.id]["graphs"]:
                    # Add existing node to this graph
                    registry[node.id]["graphs"].append(graph_id)
                    registry[node.id]["updated_at"] = time.time()
                    
                    # Atomically save updated registry
                    atomic_registry_save(user_id, "node", registry)
                    
                    # Regenerate composed files atomically
                    node_registry = load_node_registry(user_id)
                    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
                    
                    # Compose graph and save atomically
                    composed_data = compose_graph(user_id, graph_id, node_ids)
                    if composed_data:
                        atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                        atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                        atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
                    
                    return {
                        "status": "Existing PolyNode added to graph", 
                        "id": node.id, 
                        "reused": True,
                        "crossGraphReuse": True,
                        "originalGraphs": registry[node.id]["graphs"]
                    }
                else:
                    return {"status": "PolyNode already exists in this graph", "id": node.id}
            elif node_path.exists():
                # Node file exists but not in registry - this shouldn't happen, but handle gracefully
                return {"status": "PolyNode file exists but not in registry", "id": node.id}
            
            # Atomically save node file
            dal.create_node(user_id, node.id, node.dict())
            
            # Load and update registry atomically
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            
            # Update registry with node information
            if node.id not in registry:
                registry[node.id] = {
                    "name": node.name,
                    "role": node.role,
                    "graphs": [graph_id],
                    "created_at": time.time(),
                    "updated_at": time.time()
                }
            else:
                registry[node.id]["name"] = node.name
                registry[node.id]["role"] = node.role
                if graph_id not in registry[node.id]["graphs"]:
                    registry[node.id]["graphs"].append(graph_id)
                registry[node.id]["updated_at"] = time.time()
            
            # Atomically save registry
            atomic_registry_save(user_id, "node", registry)
            
            # Regenerate composed files atomically
            node_registry = load_node_registry(user_id)
            node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
            
            # Compose graph and save atomically
            composed_data = compose_graph(user_id, graph_id, node_ids)
            if composed_data:
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            
            return {"status": "PolyNode created and registered", "id": node.id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create PolyNode: {str(e)}")

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
async def update_polynode(
    user_id: str, 
    graph_id: str, 
    node_id: str, 
    node: PolyNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot update node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "update_polynode") as backup_dir:
            node.id = make_polynode_id(node.quantifier or "", getattr(node, 'adverb', "") or "", "", node.base_name or "")
            
            # Check if node exists
            node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
            if not node_path.exists():
                raise HTTPException(status_code=404, detail="Node not found")
            
            # Atomically save node file
            dal.update_node(user_id, node_id, node.dict())
            
            # Load and update registry atomically
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            
            # Update registry with node information
            if node.id not in registry:
                registry[node.id] = {
                    "name": node.name,
                    "role": node.role,
                    "graphs": [graph_id],
                    "created_at": time.time(),
                    "updated_at": time.time()
                }
            else:
                registry[node.id]["name"] = node.name
                registry[node.id]["role"] = node.role
                if graph_id not in registry[node.id]["graphs"]:
                    registry[node.id]["graphs"].append(graph_id)
                registry[node.id]["updated_at"] = time.time()
            
            # Atomically save registry
            atomic_registry_save(user_id, "node", registry)
            
            # Regenerate composed files atomically
            node_registry = load_node_registry(user_id)
            node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
            
            # Compose graph and save atomically
            composed_data = compose_graph(user_id, graph_id, node_ids)
            if composed_data:
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            
            return {"status": "PolyNode updated and registry synced", "id": node.id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update PolyNode: {str(e)}")

@router.delete("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
async def delete_polynode(
    user_id: str, 
    graph_id: str, 
    node_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    """Delete a PolyNode and clean up all related data atomically."""
    try:
        with graph_transaction(user_id, graph_id, "delete_polynode") as backup_dir:
            # Check if node exists
            node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
            if not node_path.exists():
                raise HTTPException(status_code=404, detail="Node not found")
            
            # Load existing node data
            node_data = dal.read_node(user_id, node_id)
            
            # ATOMICITY FIX: Check if node is referenced by any relations before deletion
            rel_reg_path = f"graph_data/users/{user_id}/relation_registry.json"
            if Path(rel_reg_path).exists():
                rel_registry = load_json_file(Path(rel_reg_path))
                
                # Find all relations where this node is either source or target
                referencing_relations = []
                for rel_id, rel_data in rel_registry.items():
                    if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                        referencing_relations.append({
                            "id": rel_id,
                            "name": rel_data.get("name", "unknown"),
                            "source_id": rel_data.get("source_id"),
                            "target_id": rel_data.get("target_id"),
                            "role": "source" if rel_data.get("source_id") == node_id else "target"
                        })
                
                if referencing_relations:
                    # Prevent deletion and inform user about referencing relations
                    return {
                        "error": "Cannot delete node",
                        "message": f"Node '{node_id}' cannot be deleted because it is referenced by {len(referencing_relations)} relation(s). Please delete these relations first.",
                        "referencing_relations": referencing_relations,
                        "node_id": node_id
                    }
            
            # Delete all related relationNodes and attributeNodes atomically
            morphs = node_data.get("morphs", [])
            for morph in morphs:
                # Delete relationNodes
                for rel_id in morph.get("relationNode_ids", []):
                    rel_path = Path(f"graph_data/users/{user_id}/relationNodes/{rel_id}.json")
                    if rel_path.exists():
                        rel_path.unlink()
                
                # Delete attributeNodes
                for attr_id in morph.get("attributeNode_ids", []):
                    attr_path = Path(f"graph_data/users/{user_id}/attributeNodes/{attr_id}.json")
                    if attr_path.exists():
                        attr_path.unlink()
            
            # Delete the node file
            dal.delete_node(user_id, node_id)
            
            # Update node registry atomically
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            if node_id in registry:
                # Remove this graph from the node's graphs list
                if graph_id in registry[node_id].get("graphs", []):
                    registry[node_id]["graphs"].remove(graph_id)
                
                # If node is no longer in any graphs, remove it entirely
                if not registry[node_id].get("graphs"):
                    del registry[node_id]
                
                atomic_registry_save(user_id, "node", registry)
            
            # Clean up relation_registry atomically
            rel_reg_path = f"graph_data/users/{user_id}/relation_registry.json"
            if Path(rel_reg_path).exists():
                rel_registry = load_json_file(Path(rel_reg_path))
                
                # ATOMICITY FIX: Remove relations where this node is source OR target
                to_remove = []
                for rel_id, rel_data in rel_registry.items():
                    if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                        to_remove.append(rel_id)
                
                for rel_id in to_remove:
                    del rel_registry[rel_id]
                
                atomic_registry_save(user_id, "relation", rel_registry)
            
            # Clean up attribute_registry atomically
            attr_reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
            if Path(attr_reg_path).exists():
                attr_registry = load_json_file(Path(attr_reg_path))
                
                # Remove attributes where this node is source
                to_remove = []
                for attr_id, attr_data in attr_registry.items():
                    if attr_data.get("source_id") == node_id:
                        to_remove.append(attr_id)
                
                for attr_id in to_remove:
                    del attr_registry[attr_id]
                
                atomic_registry_save(user_id, "attribute", attr_registry)
            
            # ATOMICITY FIX: Clean up source nodes that reference this node in their morphs
            # This handles the case where other nodes have relations pointing to the deleted node
            nodes_dir = Path(f"graph_data/users/{user_id}/nodes")
            if nodes_dir.exists():
                for node_file in nodes_dir.glob("*.json"):
                    if node_file.name == f"{node_id}.json":
                        continue  # Skip the node being deleted
                    
                    try:
                        other_node_data = dal.read_node(user_id, node_file.stem)
                        other_node_id = other_node_data.get("id") or other_node_data.get("node_id")
                        
                        # Skip if we can't determine the node ID
                        if not other_node_id:
                            continue
                        
                        # Check if any morph in this node references the deleted node
                        morphs_updated = False
                        for morph in other_node_data.get("morphs", []):
                            # Remove relationNode_ids that reference the deleted node
                            relation_ids = morph.get("relationNode_ids", [])
                            original_count = len(relation_ids)
                            
                            # Filter out relations that reference the deleted node
                            filtered_relation_ids = []
                            for rel_id in relation_ids:
                                # Check if this relation references the deleted node
                                rel_path = Path(f"graph_data/users/{user_id}/relationNodes/{rel_id}.json")
                                if rel_path.exists():
                                    try:
                                        rel_data = load_json_file(rel_path)
                                        if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                                            # This relation references the deleted node, remove it
                                            rel_path.unlink()  # Delete the relation file
                                            continue  # Don't add to filtered list
                                    except:
                                        # If relation file is corrupted, skip it
                                        continue
                                filtered_relation_ids.append(rel_id)
                            
                            if len(filtered_relation_ids) != original_count:
                                morph["relationNode_ids"] = filtered_relation_ids
                                morphs_updated = True
                        
                        # Save the updated node if any morphs were modified
                        if morphs_updated:
                            dal.update_node(user_id, other_node_id, other_node_data)
                    
                    except Exception as e:
                        print(f"Warning: Failed to clean up references in node {node_file.name}: {e}")
                        continue
            
            # Regenerate composed files atomically
            node_registry = load_node_registry(user_id)
            node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
            
            # Compose graph and save atomically
            composed_data = compose_graph(user_id, graph_id, node_ids)
            if composed_data:
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            
            return {"status": "PolyNode deleted and all related data cleaned up", "deleted_node_id": node_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete PolyNode: {str(e)}")

@router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
async def get_polynode(
    user_id: str, 
    graph_id: str, 
    node_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot get node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        return dal.read_node(user_id, node_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Node not found")

@router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
async def get_polynode_info(
    user_id: str, 
    graph_id: str, 
    node_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot get node info: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        node = dal.read_node(user_id, node_id)
        # Ensure attributes and relations are always present and are lists (for legacy UI compatibility)
        node["attributes"] = node.get("attributes", [])
        node["relations"] = node.get("relations", [])
        return node
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Node not found")

@router.get("/users/{user_id}/graphs/{graph_id}/get_nbh/{node_id}")
def get_node_nbh(user_id: str, graph_id: str, node_id: str):
    return get_polynode_info(user_id, graph_id, node_id)

@router.put("/users/{user_id}/graphs/{graph_id}/set_nbh/{node_id}")
def set_node_nbh(user_id: str, graph_id: str, node_id: str, nbh: str):
    """
    Set the active morph (neighborhood) for a polynode.
    This determines which morph state the node is currently in.
    """
    try:
        with graph_transaction(user_id, graph_id, "set_node_nbh") as backup_dir:
            # Load the node
            node_data = dal.read_node(user_id, node_id)
            
            # Verify the morph exists
            morph_exists = False
            for morph in node_data.get("morphs", []):
                if morph.get("morph_id") == nbh:
                    morph_exists = True
                    break
            
            if not morph_exists:
                raise HTTPException(status_code=404, detail=f"Morph {nbh} not found in node {node_id}")
            
            # Set the active morph
            node_data["nbh"] = nbh
            
            # Save the updated node
            dal.update_node(user_id, node_id, node_data)
            
            return {
                "status": "Active morph set successfully",
                "node_id": node_id,
                "active_morph": nbh,
                "available_morphs": [m.get("morph_id") for m in node_data.get("morphs", [])]
            }
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set active morph: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/submit_to_summary_queue")
def submit_all_nodes_to_summary_queue(user_id: str, graph_id: str):
    user_id = get_user_id(user_id)
    nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    sq = init_summary_queue()
    count = 0
    if os.path.exists(nodes_dir):
        for file in os.listdir(nodes_dir):
            if file.endswith(".json"):
                node_id = file[:-5]
                try:
                    node_data = dal.read_node(user_id, node_id)
                except Exception:
                    continue
                sq.submit(user_id, graph_id, node_id)
                count += 1
    return {"status": "submitted", "count": count}

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/submit_to_summary_queue")
def submit_node_to_summary_queue(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = dal.read_node(user_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    # Only submit if description is missing, empty, or contains an error
    description = node.get("description", "")
    if description and not description.startswith("Error:"):
        return {"status": "already processed", "id": node_id}
    sq = init_summary_queue()
    sq.submit(user_id, graph_id, node_id)
    return {"status": "submitted", "id": node_id}

@router.get("/summary_queue/status")
def get_summary_queue_status():
    """Get the current status of the summary queue"""
    try:
        sq = init_summary_queue()
        queue_size = sq.queue_size()
        return {
            "queue_size": queue_size,
            "status": "active" if queue_size > 0 else "idle",
            "message": f"Queue has {queue_size} pending requests" if queue_size > 0 else "No pending requests"
        }
    except Exception as e:
        return {
            "queue_size": 0,
            "status": "error",
            "message": f"Error accessing queue: {str(e)}"
        }

@router.get("/users/{user_id}/node_registry")
def get_node_registry(user_id: str):
    """
    Return the user's canonical node_registry.json for fast node lookup and autocomplete.
    """
    registry_path = os.path.join("graph_data", "users", user_id, "node_registry.json")
    if not os.path.exists(registry_path):
        return {}
    with open(registry_path, "r") as f:
        return json.load(f)

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/nlp_parse_description")
def nlp_parse_description(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = dal.read_node(user_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    description = node.get("description", "")
    if not description:
        return {"error": "No description to parse."}
    from backend.core.nlp_utils import parse_description_components
    return parse_description_components(description)


# ---------- PolyNode Routes ----------

@router.get("/users/{user_id}/polynodes/{id}")
def get_polynode_by_id(user_id: str, id: str):
    try:
        return dal.read_node(user_id, id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Node not found")

@router.get("/users/{user_id}/polynodes")
def list_polynodes(user_id: str):
    reg_path = f"graph_data/users/{user_id}/node_registry.json"
    registry = load_registry(Path(reg_path))
    return [n for n in registry if n.get("role", "") == "class"]

@router.get("/users/{user_id}/graphs/{graph_id}/cross_graph_reuse")
def get_cross_graph_reuse_stats(user_id: str, graph_id: str):
    """Get statistics about cross-graph node reuse for a specific graph."""
    registry = load_node_registry(user_id)
    reuse_count = 0
    reused_nodes = []
    
    for node_id, entry in registry.items():
        graphs = entry.get("graphs", [])
        if graph_id in graphs and len(graphs) > 1:
            # This node is used in multiple graphs, including the current one
            reuse_count += 1
            reused_nodes.append({
                "id": node_id,
                "name": entry.get("name", node_id),
                "graphs": graphs
            })
    
    return {
        "cross_graph_reuse_count": reuse_count,
        "reused_nodes": reused_nodes
    }


from backend.core.node_utils import (
    extract_base_name, extract_qualifier, extract_quantifier, compose_node_id, extract_node_name_as_is
)
from backend.core.compose import compose_graph
from backend.core.registry import load_node_registry, make_polynode_id, load_registry, save_registry
from backend.core.atomic_ops import (
    save_json_file_atomic,
    load_json_file,
    graph_transaction,
    AtomicityError,
    atomic_registry_save,
    atomic_node_save,
    atomic_composed_save
)
from backend.core.validation import require_user_and_graph
from backend.routes.users import current_active_user, User
from backend.core.auth_validation import require_self_access_or_superuser, require_graph_exists

router = APIRouter()

class Node(BaseModel):
    id: Optional[str] = None
    name: str
    base_name: Optional[str] = None
    qualifier: Optional[str] = None  # <-- allow any string, not Literal
    role: Optional[Literal["class", "individual", "process"]] = None
    description: Optional[str] = None
    attributes: List[Attribute] = []
    relations: List[Relation] = []

class NodeInput(BaseModel):
    name: str

@router.get("/users/{user_id}/graphs/{graph_id}/nodes")
async def list_all_nodes(
    user_id: str, 
    graph_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot list nodes: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    # if not require_graph_exists(user_id, graph_id):
    #     raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    user_id = get_user_id(user_id)
    nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    nodes = []
    if os.path.exists(nodes_dir):
        for file in os.listdir(nodes_dir):
            if file.endswith(".json"):
                node_id = file[:-5]
                summary = safe_node_summary(user_id, graph_id, node_id)
                if summary:
                    nodes.append(summary)
    return nodes

# --- Legacy Node CRUD functions (commented out, kept for reference) ---
# @router.post("/users/{user_id}/graphs/{graph_id}/nodes")
# def create_node(user_id: str, graph_id: str, node: Node):
#     ... (legacy logic)
#
# @router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
# def update_node(user_id: str, graph_id: str, node_id: str, node: Node):
#     ... (legacy logic)
#
# @router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
# def get_node(user_id: str, graph_id: str, node_id: str):
#     ... (legacy logic)
#
# @router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
# def get_node_info(user_id: str, graph_id: str, node_id: str):
#     ... (legacy logic)

# --- PolyNode CRUD with FastAPI Users authentication only ---
@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
async def create_polynode(
    user_id: str, 
    graph_id: str, 
    node: PolyNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot create node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "create_polynode") as backup_dir:
            # Compute ID from base_name and other fields (but not morph_name)
            node.id = make_polynode_id(node.quantifier or "", node.adjective or "", "", node.base_name)
            
            # Compute name from base_name and adjective if not provided
            if not node.name:
                if node.adjective:
                    node.name = f"{node.adjective} {node.base_name}"
                else:
                    node.name = node.base_name
            
            # Ensure node has morphs array
            if not node.morphs:
                node.morphs = []
            
            # Create basic morph if it doesn't exist
            basic_morph_exists = any(morph.name == "basic" for morph in node.morphs)
            if not basic_morph_exists:
                from backend.core.models import Morph
                basic_morph = Morph(
                    morph_id=f"basic_{node.id}",
                    node_id=node.id,
                    name="basic",
                    relationNode_ids=[],
                    attributeNode_ids=[]
                )
                node.morphs.append(basic_morph)
                # Set nbh to basic morph
                node.nbh = basic_morph.morph_id
            
            # Check if node already exists in this graph
            node_path = Path(f"graph_data/users/{user_id}/nodes/{node.id}.json")
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            
            # If node exists but is not in this graph, add it to this graph
            if node_path.exists() and node.id in registry:
                if graph_id not in registry[node.id]["graphs"]:
                    # Add existing node to this graph
                    registry[node.id]["graphs"].append(graph_id)
                    registry[node.id]["updated_at"] = time.time()
                    
                    # Atomically save updated registry
                    atomic_registry_save(user_id, "node", registry)
                    
                    # Regenerate composed files atomically
                    node_registry = load_node_registry(user_id)
                    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
                    
                    # Compose graph and save atomically
                    composed_data = compose_graph(user_id, graph_id, node_ids)
                    if composed_data:
                        atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                        atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                        atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
                    
                    return {
                        "status": "Existing PolyNode added to graph", 
                        "id": node.id, 
                        "reused": True,
                        "crossGraphReuse": True,
                        "originalGraphs": registry[node.id]["graphs"]
                    }
                else:
                    return {"status": "PolyNode already exists in this graph", "id": node.id}
            elif node_path.exists():
                # Node file exists but not in registry - this shouldn't happen, but handle gracefully
                return {"status": "PolyNode file exists but not in registry", "id": node.id}
            
            # Atomically save node file
            atomic_node_save(user_id, node.id, node.dict())
            
            # Load and update registry atomically
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            
            # Update registry with node information
            if node.id not in registry:
                registry[node.id] = {
                    "name": node.name,
                    "role": node.role,
                    "graphs": [graph_id],
                    "created_at": time.time(),
                    "updated_at": time.time()
                }
            else:
                registry[node.id]["name"] = node.name
                registry[node.id]["role"] = node.role
                if graph_id not in registry[node.id]["graphs"]:
                    registry[node.id]["graphs"].append(graph_id)
                registry[node.id]["updated_at"] = time.time()
            
            # Atomically save registry
            atomic_registry_save(user_id, "node", registry)
            
            # Regenerate composed files atomically
            node_registry = load_node_registry(user_id)
            node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
            
            # Compose graph and save atomically
            composed_data = compose_graph(user_id, graph_id, node_ids)
            if composed_data:
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            
            return {"status": "PolyNode created and registered", "id": node.id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create PolyNode: {str(e)}")

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
async def update_polynode(
    user_id: str, 
    graph_id: str, 
    node_id: str, 
    node: PolyNode,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot update node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    try:
        with graph_transaction(user_id, graph_id, "update_polynode") as backup_dir:
            node.id = make_polynode_id(node.quantifier or "", getattr(node, 'adverb', "") or "", "", node.base_name or "")
            
            # Check if node exists
            # Atomically save node file
            dal.update_node(user_id, node_id, node.dict())
            
            # Load and update registry atomically
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            
            # Update registry with node information
            if node.id not in registry:
                registry[node.id] = {
                    "name": node.name,
                    "role": node.role,
                    "graphs": [graph_id],
                    "created_at": time.time(),
                    "updated_at": time.time()
                }
            else:
                registry[node.id]["name"] = node.name
                registry[node.id]["role"] = node.role
                if graph_id not in registry[node.id]["graphs"]:
                    registry[node.id]["graphs"].append(graph_id)
                registry[node.id]["updated_at"] = time.time()
            
            # Atomically save registry
            atomic_registry_save(user_id, "node", registry)
            
            # Regenerate composed files atomically
            node_registry = load_node_registry(user_id)
            node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
            
            # Compose graph and save atomically
            composed_data = compose_graph(user_id, graph_id, node_ids)
            if composed_data:
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            
            return {"status": "PolyNode updated and registry synced", "id": node.id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update PolyNode: {str(e)}")

@router.delete("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
async def delete_polynode(
    user_id: str, 
    graph_id: str, 
    node_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot delete node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    """Delete a PolyNode and clean up all related data atomically."""
    try:
        with graph_transaction(user_id, graph_id, "delete_polynode") as backup_dir:
            # Check if node exists
            node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
            if not node_path.exists():
                raise HTTPException(status_code=404, detail="Node not found")
            
            # Load existing node data
            node_data = load_json_file(node_path)
            
            # ATOMICITY FIX: Check if node is referenced by any relations before deletion
            rel_reg_path = f"graph_data/users/{user_id}/relation_registry.json"
            if Path(rel_reg_path).exists():
                rel_registry = load_json_file(Path(rel_reg_path))
                
                # Find all relations where this node is either source or target
                referencing_relations = []
                for rel_id, rel_data in rel_registry.items():
                    if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                        referencing_relations.append({
                            "id": rel_id,
                            "name": rel_data.get("name", "unknown"),
                            "source_id": rel_data.get("source_id"),
                            "target_id": rel_data.get("target_id"),
                            "role": "source" if rel_data.get("source_id") == node_id else "target"
                        })
                
                if referencing_relations:
                    # Prevent deletion and inform user about referencing relations
                    return {
                        "error": "Cannot delete node",
                        "message": f"Node '{node_id}' cannot be deleted because it is referenced by {len(referencing_relations)} relation(s). Please delete these relations first.",
                        "referencing_relations": referencing_relations,
                        "node_id": node_id
                    }
            
            # Delete all related relationNodes and attributeNodes atomically
            morphs = node_data.get("morphs", [])
            for morph in morphs:
                # Delete relationNodes
                for rel_id in morph.get("relationNode_ids", []):
                    rel_path = Path(f"graph_data/users/{user_id}/relationNodes/{rel_id}.json")
                    if rel_path.exists():
                        rel_path.unlink()
                
                # Delete attributeNodes
                for attr_id in morph.get("attributeNode_ids", []):
                    attr_path = Path(f"graph_data/users/{user_id}/attributeNodes/{attr_id}.json")
                    if attr_path.exists():
                        attr_path.unlink()
            
            # Delete the node file
            node_path.unlink()
            
            # Update node registry atomically
            reg_path = f"graph_data/users/{user_id}/node_registry.json"
            registry = load_registry(Path(reg_path))
            if node_id in registry:
                # Remove this graph from the node's graphs list
                if graph_id in registry[node_id].get("graphs", []):
                    registry[node_id]["graphs"].remove(graph_id)
                
                # If node is no longer in any graphs, remove it entirely
                if not registry[node_id].get("graphs"):
                    del registry[node_id]
                
                atomic_registry_save(user_id, "node", registry)
            
            # Clean up relation_registry atomically
            rel_reg_path = f"graph_data/users/{user_id}/relation_registry.json"
            if Path(rel_reg_path).exists():
                rel_registry = load_json_file(Path(rel_reg_path))
                
                # ATOMICITY FIX: Remove relations where this node is source OR target
                to_remove = []
                for rel_id, rel_data in rel_registry.items():
                    if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                        to_remove.append(rel_id)
                
                for rel_id in to_remove:
                    del rel_registry[rel_id]
                
                atomic_registry_save(user_id, "relation", rel_registry)
            
            # Clean up attribute_registry atomically
            attr_reg_path = f"graph_data/users/{user_id}/attribute_registry.json"
            if Path(attr_reg_path).exists():
                attr_registry = load_json_file(Path(attr_reg_path))
                
                # Remove attributes where this node is source
                to_remove = []
                for attr_id, attr_data in attr_registry.items():
                    if attr_data.get("source_id") == node_id:
                        to_remove.append(attr_id)
                
                for attr_id in to_remove:
                    del attr_registry[attr_id]
                
                atomic_registry_save(user_id, "attribute", attr_registry)
            
            # ATOMICITY FIX: Clean up source nodes that reference this node in their morphs
            # This handles the case where other nodes have relations pointing to the deleted node
            nodes_dir = Path(f"graph_data/users/{user_id}/nodes")
            if nodes_dir.exists():
                for node_file in nodes_dir.glob("*.json"):
                    if node_file.name == f"{node_id}.json":
                        continue  # Skip the node being deleted
                    
                    try:
                        other_node_data = load_json_file(node_file)
                        other_node_id = other_node_data.get("id") or other_node_data.get("node_id")
                        
                        # Skip if we can't determine the node ID
                        if not other_node_id:
                            continue
                        
                        # Check if any morph in this node references the deleted node
                        morphs_updated = False
                        for morph in other_node_data.get("morphs", []):
                            # Remove relationNode_ids that reference the deleted node
                            relation_ids = morph.get("relationNode_ids", [])
                            original_count = len(relation_ids)
                            
                            # Filter out relations that reference the deleted node
                            filtered_relation_ids = []
                            for rel_id in relation_ids:
                                # Check if this relation references the deleted node
                                rel_path = Path(f"graph_data/users/{user_id}/relationNodes/{rel_id}.json")
                                if rel_path.exists():
                                    try:
                                        rel_data = load_json_file(rel_path)
                                        if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                                            # This relation references the deleted node, remove it
                                            rel_path.unlink()  # Delete the relation file
                                            continue  # Don't add to filtered list
                                    except:
                                        # If relation file is corrupted, skip it
                                        continue
                                filtered_relation_ids.append(rel_id)
                            
                            if len(filtered_relation_ids) != original_count:
                                morph["relationNode_ids"] = filtered_relation_ids
                                morphs_updated = True
                        
                        # Save the updated node if any morphs were modified
                        if morphs_updated:
                            atomic_node_save(user_id, other_node_id, other_node_data)
                    
                    except Exception as e:
                        print(f"Warning: Failed to clean up references in node {node_file.name}: {e}")
                        continue
            
            # Regenerate composed files atomically
            node_registry = load_node_registry(user_id)
            node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
            
            # Compose graph and save atomically
            composed_data = compose_graph(user_id, graph_id, node_ids)
            if composed_data:
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
                atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
                atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
            
            return {"status": "PolyNode deleted and all related data cleaned up", "deleted_node_id": node_id}
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete PolyNode: {str(e)}")

@router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
async def get_polynode(
    user_id: str, 
    graph_id: str, 
    node_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot get node: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    path = f"graph_data/users/{user_id}/nodes/{node_id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path) as f:
        return json.load(f)

@router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
async def get_polynode_info(
    user_id: str, 
    graph_id: str, 
    node_id: str,
    user: User = Depends(current_active_user)
):
    # Authorization check: user can only access their own data unless superuser
    if not user.is_superuser and str(user.id) != user_id:
        raise HTTPException(
            status_code=403,
            detail="Cannot get node info: Access denied. You can only access your own data."
        )
    
    # Validate graph exists
    if not require_graph_exists(user_id, graph_id):
        raise HTTPException(status_code=404, detail=f"Graph '{graph_id}' does not exist for user '{user_id}'")
    
    path = f"graph_data/users/{user_id}/nodes/{node_id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path) as f:
        node = json.load(f)
    # Ensure attributes and relations are always present and are lists (for legacy UI compatibility)
    node["attributes"] = node.get("attributes", [])
    node["relations"] = node.get("relations", [])
    return node

@router.get("/users/{user_id}/graphs/{graph_id}/get_nbh/{node_id}")
def get_node_nbh(user_id: str, graph_id: str, node_id: str):
    return get_polynode_info(user_id, graph_id, node_id)

@router.put("/users/{user_id}/graphs/{graph_id}/set_nbh/{node_id}")
def set_node_nbh(user_id: str, graph_id: str, node_id: str, nbh: str):
    """
    Set the active morph (neighborhood) for a polynode.
    This determines which morph state the node is currently in.
    """
    try:
        with graph_transaction(user_id, graph_id, "set_node_nbh") as backup_dir:
            # Load the node
            node_data = dal.read_node(user_id, node_id)
            
            # Verify the morph exists
            morph_exists = False
            for morph in node_data.get("morphs", []):
                if morph.get("morph_id") == nbh:
                    morph_exists = True
                    break
            
            if not morph_exists:
                raise HTTPException(status_code=404, detail=f"Morph {nbh} not found in node {node_id}")
            
            # Set the active morph
            node_data["nbh"] = nbh
            
            # Save the updated node
            dal.update_node(user_id, node_id, node_data)
            
            return {
                "status": "Active morph set successfully",
                "node_id": node_id,
                "active_morph": nbh,
                "available_morphs": [m.get("morph_id") for m in node_data.get("morphs", [])]
            }
            
    except AtomicityError as e:
        raise HTTPException(status_code=500, detail=f"Atomic operation failed: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to set active morph: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/submit_to_summary_queue")
def submit_all_nodes_to_summary_queue(user_id: str, graph_id: str):
    user_id = get_user_id(user_id)
    nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    sq = init_summary_queue()
    count = 0
    if os.path.exists(nodes_dir):
        for file in os.listdir(nodes_dir):
            if file.endswith(".json"):
                node_id = file[:-5]
                try:
                    node_data = dal.read_node(user_id, node_id)
                except Exception:
                    continue
                sq.submit(user_id, graph_id, node_id)
                count += 1
    return {"status": "submitted", "count": count}

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/submit_to_summary_queue")
def submit_node_to_summary_queue(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = dal.read_node(user_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    # Only submit if description is missing, empty, or contains an error
    description = node.get("description", "")
    if description and not description.startswith("Error:"):
        return {"status": "already processed", "id": node_id}
    sq = init_summary_queue()
    sq.submit(user_id, graph_id, node_id)
    return {"status": "submitted", "id": node_id}

@router.get("/summary_queue/status")
def get_summary_queue_status():
    """Get the current status of the summary queue"""
    try:
        sq = init_summary_queue()
        queue_size = sq.queue_size()
        return {
            "queue_size": queue_size,
            "status": "active" if queue_size > 0 else "idle",
            "message": f"Queue has {queue_size} pending requests" if queue_size > 0 else "No pending requests"
        }
    except Exception as e:
        return {
            "queue_size": 0,
            "status": "error",
            "message": f"Error accessing queue: {str(e)}"
        }

@router.get("/users/{user_id}/node_registry")
def get_node_registry(user_id: str):
    """
    Return the user's canonical node_registry.json for fast node lookup and autocomplete.
    """
    registry_path = os.path.join("graph_data", "users", user_id, "node_registry.json")
    if not os.path.exists(registry_path):
        return {}
    with open(registry_path, "r") as f:
        return json.load(f)

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/nlp_parse_description")
def nlp_parse_description(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = dal.read_node(user_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    description = node.get("description", "")
    if not description:
        return {"error": "No description to parse."}
    from backend.core.nlp_utils import parse_description_components
    return parse_description_components(description)


# ---------- PolyNode Routes ----------

@router.get("/users/{user_id}/polynodes/{id}")
def get_polynode_by_id(user_id: str, id: str):
    path = f"graph_data/users/{user_id}/nodes/{id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path) as f:
        return json.load(f)

@router.get("/users/{user_id}/polynodes")
def list_polynodes(user_id: str):
    reg_path = f"graph_data/users/{user_id}/node_registry.json"
    registry = load_registry(Path(reg_path))
    return [n for n in registry if n.get("role", "") == "class"]

@router.get("/users/{user_id}/graphs/{graph_id}/cross_graph_reuse")
def get_cross_graph_reuse_stats(user_id: str, graph_id: str):
    """Get statistics about cross-graph node reuse for a specific graph."""
    registry = load_node_registry(user_id)
    reuse_count = 0
    reused_nodes = []
    
    for node_id, entry in registry.items():
        graphs = entry.get("graphs", [])
        if graph_id in graphs and len(graphs) > 1:
            # This node is used in multiple graphs, including the current one
            reuse_count += 1
            reused_nodes.append({
                "id": node_id,
                "name": entry.get("name", node_id),
                "graphs": graphs
            })
    
    return {
        "cross_graph_reuse_count": reuse_count,
        "reused_nodes": reused_nodes
    }
