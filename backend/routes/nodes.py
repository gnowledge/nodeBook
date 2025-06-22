from fastapi import APIRouter, HTTPException
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

from backend.core.node_utils import (
    extract_base_name, extract_qualifier, extract_quantifier, compose_node_id, extract_node_name_as_is
)
from backend.core.compose import compose_graph
from backend.core.registry import load_node_registry, make_polynode_id, make_morph_id, load_registry, save_registry

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
def list_all_nodes(user_id: str, graph_id: str):
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

# --- PolyNode CRUD with legacy route decorators ---
@router.post("/users/{user_id}/graphs/{graph_id}/nodes")
def create_polynode(user_id: str, graph_id: str, node: PolyNode):
    # Compute ID from base_name and other fields
    morph_name = node.morphs[0].name if node.morphs and len(node.morphs) > 0 and hasattr(node.morphs[0], 'name') else ""
    node.id = make_polynode_id(node.quantifier or "", node.adjective or "", morph_name, node.base_name)
    
    # Compute name from base_name and adjective if not provided
    if not node.name:
        if node.adjective:
            node.name = f"{node.adjective} {node.base_name}"
        else:
            node.name = node.base_name
    
    # Ensure node has morphs array
    if not node.morphs:
        node.morphs = []
    
    # Create static morph if it doesn't exist
    static_morph_exists = any(morph.name == "static" for morph in node.morphs)
    if not static_morph_exists:
        from backend.core.models import Morph
        static_morph = Morph(
            morph_id=f"static_{node.id}",
            node_id=node.id,
            name="static",
            relationNode_ids=[],
            attributeNode_ids=[]
        )
        node.morphs.append(static_morph)
        # Set nbh to static morph
        node.nbh = static_morph.morph_id
    
    path = f"graph_data/users/{user_id}/nodes/{node.id}.json"
    reg_path = f"graph_data/users/{user_id}/node_registry.json"
    os.makedirs(os.path.dirname(path), exist_ok=True)
    if os.path.exists(path):
        raise HTTPException(status_code=400, detail="Node already exists")
    with open(path, "w") as f:
        json.dump(node.dict(), f, indent=2)
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
    save_registry(Path(reg_path), registry)
    # Regenerate composed.json after node change
    node_registry = load_node_registry(user_id)
    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
    compose_graph(user_id, graph_id, node_ids)
    return {"status": "PolyNode created and registered", "id": node.id}

@router.put("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def update_polynode(user_id: str, graph_id: str, node_id: str, node: PolyNode):
    morph_name = node.morphs[0].name if node.morphs and len(node.morphs) > 0 and hasattr(node.morphs[0], 'name') else ""
    node.id = make_polynode_id(node.quantifier or "", getattr(node, 'adverb', "") or "", morph_name, node.base_name or "")
    path = f"graph_data/users/{user_id}/nodes/{node_id}.json"
    reg_path = f"graph_data/users/{user_id}/node_registry.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, "w") as f:
        json.dump(node.dict(), f, indent=2)
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
    save_registry(Path(reg_path), registry)
    # Regenerate composed.json after node change
    node_registry = load_node_registry(user_id)
    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
    compose_graph(user_id, graph_id, node_ids)
    return {"status": "PolyNode updated and registry synced", "id": node.id}

@router.delete("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def delete_polynode(user_id: str, graph_id: str, node_id: str):
    """Delete a PolyNode and clean up all related data."""
    path = f"graph_data/users/{user_id}/nodes/{node_id}.json"
    reg_path = f"graph_data/users/{user_id}/node_registry.json"
    
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    
    # Load node data to get morphs and relation/attribute IDs
    with open(path, "r") as f:
        node_data = json.load(f)
    
    # Delete all related relationNodes
    morphs = node_data.get("morphs", [])
    for morph in morphs:
        # Delete relationNodes
        for rel_id in morph.get("relationNode_ids", []):
            rel_path = f"graph_data/users/{user_id}/relationNodes/{rel_id}.json"
            if os.path.exists(rel_path):
                os.remove(rel_path)
        
        # Delete attributeNodes
        for attr_id in morph.get("attributeNode_ids", []):
            attr_path = f"graph_data/users/{user_id}/attributeNodes/{attr_id}.json"
            if os.path.exists(attr_path):
                os.remove(attr_path)
    
    # Delete the node file
    os.remove(path)
    
    # Update node registry
    registry = load_registry(Path(reg_path))
    if node_id in registry:
        # Remove this graph from the node's graphs list
        if graph_id in registry[node_id].get("graphs", []):
            registry[node_id]["graphs"].remove(graph_id)
        
        # If node is no longer in any graphs, remove it entirely
        if not registry[node_id].get("graphs"):
            del registry[node_id]
        
        save_registry(Path(reg_path), registry)
    
    # Clean up relation_node_registry
    rel_reg_path = f"graph_data/users/{user_id}/relation_node_registry.json"
    if os.path.exists(rel_reg_path):
        with open(rel_reg_path, "r") as f:
            rel_registry = json.load(f)
        
        # Remove relations where this node is source or target
        to_remove = []
        for rel_id, rel_data in rel_registry.items():
            if rel_data.get("source_id") == node_id or rel_data.get("target_id") == node_id:
                to_remove.append(rel_id)
        
        for rel_id in to_remove:
            del rel_registry[rel_id]
        
        with open(rel_reg_path, "w") as f:
            json.dump(rel_registry, f, indent=2)
    
    # Clean up attribute_node_registry
    attr_reg_path = f"graph_data/users/{user_id}/attribute_node_registry.json"
    if os.path.exists(attr_reg_path):
        with open(attr_reg_path, "r") as f:
            attr_registry = json.load(f)
        
        # Remove attributes where this node is source
        to_remove = []
        for attr_id, attr_data in attr_registry.items():
            if attr_data.get("source_id") == node_id:
                to_remove.append(attr_id)
        
        for attr_id in to_remove:
            del attr_registry[attr_id]
        
        with open(attr_reg_path, "w") as f:
            json.dump(attr_registry, f, indent=2)
    
    # Regenerate composed.json after node deletion
    node_registry = load_node_registry(user_id)
    node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
    compose_graph(user_id, graph_id, node_ids)
    
    return {"status": "PolyNode deleted and all related data cleaned up", "deleted_node_id": node_id}

@router.get("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}")
def get_polynode(user_id: str, graph_id: str, node_id: str):
    path = f"graph_data/users/{user_id}/nodes/{node_id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path) as f:
        return json.load(f)

@router.get("/users/{user_id}/graphs/{graph_id}/getInfo/{node_id}")
def get_polynode_info(user_id: str, graph_id: str, node_id: str):
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
                    node_data = load_node(user_id, graph_id, node_id)
                except Exception:
                    continue
                sq.submit(user_id, graph_id, node_id, node_data)
                count += 1
    return {"status": "submitted", "count": count}

@router.post("/users/{user_id}/graphs/{graph_id}/nodes/{node_id}/submit_to_summary_queue")
def submit_node_to_summary_queue(user_id: str, graph_id: str, node_id: str):
    user_id = get_user_id(user_id)
    try:
        node = load_node(user_id, graph_id, node_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Node not found")
    # Only submit if description is missing or empty
    if node.get("description"):
        return {"status": "already processed", "id": node_id}
    sq = init_summary_queue()
    sq.submit(user_id, graph_id, node_id, node)
    return {"status": "submitted", "id": node_id}

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
        node = load_node(user_id, graph_id, node_id)
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

# ---------- Morph Routes ----------

@router.post("/users/{user_id}/morphs/")
def create_morph(user_id: str, morph: Morph):
    morph.morph_id = make_morph_id(morph.name, morph.node_id)
    morph_path = f"graph_data/users/{user_id}/morphs/{morph.morph_id}.json"
    reg_path = f"graph_data/users/{user_id}/morph_registry.json"
    os.makedirs(os.path.dirname(morph_path), exist_ok=True)
    if os.path.exists(morph_path):
        raise HTTPException(status_code=400, detail="Morph already exists")
    with open(morph_path, "w") as f:
        json.dump(morph.dict(), f, indent=2)
    # Update registry
    if os.path.exists(reg_path):
        with open(reg_path) as f:
            registry = json.load(f)
    else:
        registry = {}
    registry[morph.morph_id] = morph.dict()
    with open(reg_path, "w") as f:
        json.dump(registry, f, indent=2)
    return {"status": "Morph created and registered"}

@router.get("/users/{user_id}/morphs/{morph_id}")
def get_morph(user_id: str, morph_id: str):
    morph_path = f"graph_data/users/{user_id}/morphs/{morph_id}.json"
    if not os.path.exists(morph_path):
        raise HTTPException(status_code=404, detail="Morph not found")
    with open(morph_path) as f:
        return json.load(f)

@router.put("/users/{user_id}/morphs/{morph_id}")
def update_morph(user_id: str, morph_id: str, morph: Morph):
    morph.morph_id = make_morph_id(morph.name, morph.node_id)
    morph_path = f"graph_data/users/{user_id}/morphs/{morph_id}.json"
    reg_path = f"graph_data/users/{user_id}/morph_registry.json"
    if not os.path.exists(morph_path):
        raise HTTPException(status_code=404, detail="Morph not found")
    with open(morph_path, "w") as f:
        json.dump(morph.dict(), f, indent=2)
    # Update registry
    if os.path.exists(reg_path):
        with open(reg_path) as f:
            registry = json.load(f)
    else:
        registry = {}
    registry[morph.morph_id] = morph.dict()
    with open(reg_path, "w") as f:
        json.dump(registry, f, indent=2)
    return {"status": "Morph updated and registry synced"}

@router.delete("/users/{user_id}/morphs/{morph_id}")
def delete_morph(user_id: str, morph_id: str):
    morph_path = f"graph_data/users/{user_id}/morphs/{morph_id}.json"
    reg_path = f"graph_data/users/{user_id}/morph_registry.json"
    if os.path.exists(morph_path):
        os.remove(morph_path)
        # Update registry
        if os.path.exists(reg_path):
            with open(reg_path) as f:
                registry = json.load(f)
            if morph_id in registry:
                del registry[morph_id]
                with open(reg_path, "w") as f:
                    json.dump(registry, f, indent=2)
        return {"status": "Morph deleted and registry updated"}
    raise HTTPException(status_code=404, detail="Morph not found")

@router.get("/users/{user_id}/morphs")
def list_morphs(user_id: str):
    reg_path = f"graph_data/users/{user_id}/morph_registry.json"
    if os.path.exists(reg_path):
        with open(reg_path) as f:
            registry = json.load(f)
        return list(registry.values())
    return []
