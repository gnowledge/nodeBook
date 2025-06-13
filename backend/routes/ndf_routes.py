from fastapi import APIRouter, Request, HTTPException, Body
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
from backend.core.cnl_parser import parse_cnl_to_parsed_json as original_parse_cnl_to_parsed_json
from backend.core.cnl_parser import parse_node_title
from backend.core.registry import create_node_if_missing, load_node_registry, update_node_registry, save_node_registry


router = APIRouter(prefix="/ndf")  # All routes prefixed with /api/ndf


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


def generate_composed_graph(user_id: str, graph_id: str, id_to_name: dict = None) -> dict:
    """
    Generate composed.json and composed.yaml for a given graph,
    based on parsed.json, and ensure each node has its own .json file.
    Uses canonical extraction helpers for all node creation.
    """
    base_path = get_data_root() / "users" / user_id / "graphs" / graph_id
    parsed_path = base_path / "parsed.json"
    composed_path = base_path / "composed.json"
    composed_yaml_path = base_path / "composed.yaml"

    if not parsed_path.exists():
        raise FileNotFoundError(f"parsed.json not found for graph: {graph_id}")

    parsed = load_json_file(parsed_path)
    composed = {
        "graph_id": parsed.get("graph_id", graph_id),
        "nodes": []
    }

    # Build id_to_name if not provided
    if id_to_name is None:
        id_to_name = {}
        for n in parsed["nodes"]:
            if isinstance(n, dict):
                id_to_name[n["id"]] = n.get("name", n["id"])
            elif isinstance(n, str):
                id_to_name[n] = n

    # Collect all node ids and their best CNL string (prefer section title, else fallback)
    node_cnl_map = {}
    for n in parsed["nodes"]:
        if isinstance(n, dict):
            node_cnl_map[n["id"]] = n.get("title") or n.get("name") or n["id"]
        elif isinstance(n, str):
            node_cnl_map[n] = n

    # Also collect target nodes from relations if not already present
    for rel in parsed.get("relations", []):
        target_id = rel.get("target")
        target_cnl = rel.get("target_cnl") or id_to_name.get(target_id) or target_id.replace('_', ' ')
        if target_id and target_id not in node_cnl_map:
            node_cnl_map[target_id] = target_cnl

    # --- Node creation logic: canonicalize and attach attributes/relations ---
    seen_ids = set()
    for node_id, node_cnl in node_cnl_map.items():
        # Canonicalize node fields using parse_node_title (crucial for deduplication and user-respecting names)
        title_info = parse_node_title(node_cnl)
        node_obj = {
            "id": title_info["id"],
            "base": title_info.get("base"),
            "quantifier": title_info.get("quantifier"),
            "qualifier": title_info.get("qualifier"),
            "name": title_info.get("name"),
            "description": ""
        }
        # Merge in any extra fields from parsed nodes (e.g., description)
        for n in parsed["nodes"]:
            if isinstance(n, dict) and normalize_id(n["id"]) == node_obj["id"]:
                node_obj["description"] = n.get("description", node_obj["description"])
                break
        # Attach attributes and relations (populate outgoing relations for this node)
        node_obj["attributes"] = [attr for attr in parsed.get("attributes", []) if normalize_id(attr.get("target")) == node_obj["id"]]
        node_obj["relations"] = [
            # For each relation where this node is the source, attach the relation
            {k: v for k, v in rel.items() if k != "source"}
            for rel in parsed.get("relations", []) if normalize_id(rel.get("source")) == node_obj["id"]
        ]
        if node_obj["id"] not in seen_ids:
            composed["nodes"].append(node_obj)
            seen_ids.add(node_obj["id"])

    # Save as composed.json
    save_json_file(composed_path, composed)

    # Also write composed.yaml for preview
    import yaml
    with composed_yaml_path.open("w", encoding="utf-8") as f:
        yaml.dump(composed, f, sort_keys=False, allow_unicode=True)

    # Create or update individual node files in global store
    node_dir = get_data_root() / "users" / user_id / "nodes"
    node_dir.mkdir(parents=True, exist_ok=True)
    for node in composed["nodes"]:
        node_path = node_dir / f"{node['id']}.json"
        node_data = {
            "id": node["id"],
            "name": node.get("name", str(node["id"])),
            "base": node.get("base", ""),
            "quantifier": node.get("quantifier"),
            "qualifier": node.get("qualifier"),
            "attributes": node.get("attributes", []),
            "relations": node.get("relations", [])
        }
        save_json_file(node_path, node_data)

    return composed

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
    cleaned = clean_cnl_payload(body)
    cnl_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "cnl.md"
    cnl_path.write_text(cleaned, encoding="utf-8")
    return {"status": "ok"}


@router.post("/users/{user_id}/graphs/{graph_id}/parse")
def parse_graph(user_id: str, graph_id: str):
    """
    Parse the user's CNL markdown file (cnl.md) for a graph into a structured parsed.json.
    Steps:
    1. Load the CNL markdown and extract node sections (title, description, CNL block).
    2. For each node section:
       - Canonicalize the node title (quantifier, qualifier, base, id, name) using parse_node_title.
       - Add the node to parsed["nodes"].
       - Parse the CNL block for relations and attributes.
    3. Ensure all referenced nodes exist in the registry and as node files.
    4. Normalize all IDs in relations/attributes.
    5. Save parsed.json and call generate_composed_graph to build the canonical composed.json.
    """
    from backend.core.utils import load_text_file
    from backend.core.cnl_parser import extract_node_sections_from_markdown, parse_logical_cnl, normalize_id

    graph_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "cnl.md"
    parsed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "parsed.json"

    if not graph_path.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")

    raw_md = load_text_file(graph_path)
    sections = extract_node_sections_from_markdown(raw_md)
    registry = load_node_registry(user_id)

    parsed = {
        "graph_id": graph_id,
        "nodes": [],
        "relations": [],
        "attributes": []
    }

    id_to_name = {}  # Map normalized id to user-entered name

    for section in sections:
        # Canonicalize node id and name using parse_node_title
        node_id = normalize_id(section["id"])
        parsed["nodes"].append(node_id)
        id_to_name[node_id] = section["id"]  # Store user-entered name
        parsed["nodes"].append({
            "id": node_id,
            "name": section["id"],
            "description": section.get("description", "")
        })

        # Ensure node file and registry entry exist
        create_node_if_missing(user_id, node_id, name=section["id"])
        update_node_registry(registry, node_id, graph_id)

        # Parse CNL block for facts (relations, attributes)
        facts = parse_logical_cnl(section["cnl"], subject=node_id)

        print(f"📦 Node: {node_id} — Found {len(facts)} facts")

        for fact in facts:
            if fact["type"] == "relation":
                # Add relation to parsed["relations"]
                target_id = fact.get("target") or fact.get("object")
                parsed["relations"].append({
                    "name": fact["name"],
                    "adverb": fact.get("adverb"),
                    "modality": fact.get("modality"),
                    "source": fact.get("subject"),
                    "target": target_id,
                    "target_quantifier": fact.get("target_quantifier"),
                    "target_qualifier": fact.get("target_qualifier"),
                    "target_base": fact.get("target_base")
                })
            elif fact["type"] == "attribute":
                parsed["attributes"].append({
                    "name": fact["name"],
                    "adverb": fact.get("adverb"),
                    "modality": fact.get("modality"),
                    "value": fact.get("value"),
                    "unit": fact.get("unit", ""),
                    "target": fact["target"]
                })
            elif fact["type"] == "attribute":
                parsed["attributes"].append({
                    "name": fact["name"],
                    "value": fact["value"],
                    "unit": fact.get("unit", ""),
                    "target": fact["target"]
                })

    save_json_file(get_data_root() / "users" / user_id / "node_registry.json", registry)
    ensure_all_nodes_exist(user_id, graph_id, parsed)
    # Normalize source and target IDs in parsed relations and attributes
    for rel in parsed["relations"]:
        rel["source"] = normalize_id(rel["source"])
        rel["target"] = normalize_id(rel["target"])

    for attr in parsed["attributes"]:
        attr["target"] = normalize_id(attr["target"])

    save_json_file(parsed_path, parsed)

    print("✅ Parsed relations:", parsed["relations"])
    print("✅ Parsed attributes:", parsed["attributes"])

    # Ensure all mentioned nodes (in relations or attributes) exist
    mentioned = set()
    for rel in parsed["relations"]:
        mentioned.add(rel["source"])
        mentioned.add(rel["target"])
    for attr in parsed["attributes"]:
        mentioned.add(attr["target"])

    for node_id in mentioned:
        # Use id_to_name if available, else fallback to id
        create_node_if_missing(user_id, node_id, name=id_to_name.get(node_id, node_id))
        update_node_registry(registry, node_id, graph_id)

    try:
        # Compose the canonical graph (composed.json) from parsed.json
        composed = generate_composed_graph(user_id, graph_id, id_to_name=id_to_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsed but failed to generate composed.json: {e}")

    return parsed


def generate_composed_graph(user_id: str, graph_id: str, id_to_name: dict = None) -> dict:
    """
    Compose the canonical composed.json and node files for a graph from parsed.json.
    Steps:
    1. Load parsed.json (output of parse_graph).
    2. For every node (including targets in relations), use parse_node_title to extract canonical fields (id, name, base, quantifier, qualifier).
    3. For each node:
       - Merge in any extra fields (e.g., description from markdown section).
       - Attach all attributes (where this node is the target).
       - Attach all outgoing relations (where this node is the source).
    4. Deduplicate nodes by id.
    5. Save composed.json and update individual node files in the user's node directory.
    """
    base_path = get_data_root() / "users" / user_id / "graphs" / graph_id
    parsed_path = base_path / "parsed.json"
    composed_path = base_path / "composed.json"
    composed_yaml_path = base_path / "composed.yaml"

    if not parsed_path.exists():
        raise FileNotFoundError(f"parsed.json not found for graph: {graph_id}")

    parsed = load_json_file(parsed_path)
    composed = {
        "graph_id": parsed.get("graph_id", graph_id),
        "nodes": []
    }

    # Build id_to_name if not provided
    if id_to_name is None:
        id_to_name = {}
        for n in parsed["nodes"]:
            if isinstance(n, dict):
                id_to_name[n["id"]] = n.get("name", n["id"])
            elif isinstance(n, str):
                id_to_name[n] = n

    # Collect all node ids and their best CNL string (prefer section title, else fallback)
    node_cnl_map = {}
    for n in parsed["nodes"]:
        if isinstance(n, dict):
            node_cnl_map[n["id"]] = n.get("title") or n.get("name") or n["id"]
        elif isinstance(n, str):
            node_cnl_map[n] = n

    # Also collect target nodes from relations if not already present
    for rel in parsed.get("relations", []):
        target_id = rel.get("target")
        target_cnl = rel.get("target_cnl") or id_to_name.get(target_id) or target_id.replace('_', ' ')
        if target_id and target_id not in node_cnl_map:
            node_cnl_map[target_id] = target_cnl

    # --- Node creation logic: canonicalize and attach attributes/relations ---
    seen_ids = set()
    for node_id, node_cnl in node_cnl_map.items():
        # Canonicalize node fields using parse_node_title (crucial for deduplication and user-respecting names)
        title_info = parse_node_title(node_cnl)
        node_obj = {
            "id": title_info["id"],
            "base": title_info.get("base"),
            "quantifier": title_info.get("quantifier"),
            "qualifier": title_info.get("qualifier"),
            "name": title_info.get("name"),
            "description": ""
        }
        # Merge in any extra fields from parsed nodes (e.g., description)
        for n in parsed["nodes"]:
            if isinstance(n, dict) and normalize_id(n["id"]) == node_obj["id"]:
                node_obj["description"] = n.get("description", node_obj["description"])
                break
        # Attach attributes and relations (populate outgoing relations for this node)
        node_obj["attributes"] = [attr for attr in parsed.get("attributes", []) if normalize_id(attr.get("target")) == node_obj["id"]]
        node_obj["relations"] = [
            # For each relation where this node is the source, attach the relation
            {k: v for k, v in rel.items() if k != "source"}
            for rel in parsed.get("relations", []) if normalize_id(rel.get("source")) == node_obj["id"]
        ]
        if node_obj["id"] not in seen_ids:
            composed["nodes"].append(node_obj)
            seen_ids.add(node_obj["id"])

    # Save as composed.json
    save_json_file(composed_path, composed)

    # Also write composed.yaml for preview
    import yaml
    with composed_yaml_path.open("w", encoding="utf-8") as f:
        yaml.dump(composed, f, sort_keys=False, allow_unicode=True)

    # Create or update individual node files in global store
    node_dir = get_data_root() / "users" / user_id / "nodes"
    node_dir.mkdir(parents=True, exist_ok=True)
    for node in composed["nodes"]:
        node_path = node_dir / f"{node['id']}.json"
        node_data = {
            "id": node["id"],
            "name": node.get("name", str(node["id"])),
            "base": node.get("base", ""),
            "quantifier": node.get("quantifier"),
            "qualifier": node.get("qualifier"),
            "attributes": node.get("attributes", []),
            "relations": node.get("relations", [])
        }
        save_json_file(node_path, node_data)

    return composed


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

@router.get("/users/{user_id}/graphs/{graph_id}/composed.yaml")
async def get_composed_yaml(user_id: str, graph_id: str):
    composed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "composed.json"
    if not composed_path.exists():
        raise HTTPException(status_code=404, detail="composed.json not found")

    data = load_json_file(composed_path)
    yaml_text = yaml.dump(data, sort_keys=False, allow_unicode=True)
    return PlainTextResponse(content=yaml_text, media_type="text/plain")


@router.get("/users/{user_id}/graphs/{graph_id}/composed")
def get_composed_json(user_id: str, graph_id: str):
    """
    Returns the composed.json for use by the frontend as structured graph data.
    """
    composed_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "composed.json"
    if not composed_path.exists():
        raise HTTPException(status_code=404, detail="composed.json not found")

    return load_json_file(composed_path)


@router.get("/users/{user_id}/graphs/{graph_id}/graph")
def get_cytoscape_graph(user_id: str, graph_id: str):
    graph_dir = get_data_root() / "users" / user_id / "graphs" / graph_id
    parsed_path = graph_dir / "parsed.json"
    composed_path = graph_dir / "composed.json"

    if not parsed_path.exists():
        raise HTTPException(status_code=404, detail="parsed.json not found")

    regenerate = (
        not composed_path.exists() or
        getmtime(parsed_path) > getmtime(composed_path)
    )

    if regenerate:
        try:
            composed = generate_composed_graph(user_id, graph_id)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate composed.json: {e}")
    else:
        composed = load_json_file(composed_path)

    nodes = [
        {
            "data": {
                "id": node["id"],
                "label": node.get("name", node["id"]),
                "description": node.get("description", "")
            }
        }
        for node in composed.get("nodes", [])
    ]

    edges = [
        {
            "data": {
                "id": f"{rel['source']}_{rel['name']}_{rel['target']}_{i}",
                "source": rel["source"],
                "target": rel["target"],
                "label": rel["name"]
            }
        }
        for i, rel in enumerate(composed.get("relations", []))
    ]

    return {"nodes": nodes, "edges": edges}


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
async def create_graph(user_id: str, graph_id: str, req: GraphInitRequest):
    graph_dir = get_data_root() / "users" / user_id / "graphs" / graph_id
    template_dir = Path("graph_data/global/templates/defaultGraphFiles")

    if graph_dir.exists():
        raise HTTPException(status_code=400, detail="Graph already exists")

    try:
        graph_dir.mkdir(parents=True)

        for fname in ["cnl.md", "parsed.json", "metadata.yaml"]:
            src = template_dir / fname
            dest = graph_dir / fname
            if not src.exists():
                raise HTTPException(status_code=500, detail=f"Template file missing: {fname}")
            copyfile(src, dest)

        metadata_path = graph_dir / "metadata.yaml"
        if metadata_path.exists():
            metadata = yaml.safe_load(metadata_path.read_text()) or {}
            metadata["title"] = req.title
            metadata["description"] = req.description
            timestamp = datetime.utcnow().isoformat()
            metadata["created"] = metadata.get("created", timestamp)
            metadata["modified"] = timestamp
            with metadata_path.open("w") as f:
                yaml.dump(metadata, f, sort_keys=False)

        return {"status": "created", "graph": graph_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating graph: {e}")


@router.get("/users/{user_id}/graphs/{graph_id}/metadata.yaml")
def get_metadata_yaml(user_id: str, graph_id: str):
    metadata_path = get_data_root() / "users" / user_id / "graphs" / graph_id / "metadata.yaml"
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="metadata.yaml not found")
    return FileResponse(metadata_path, media_type="text/plain")


@router.delete("/users/{user_id}/graphs/{graph_id}")
def delete_graph(user_id: str, graph_id: str):
    """
    Delete a graph: removes the graph directory, updates node_registry.json, and deletes orphaned nodes.
    """
    graph_dir = get_data_root() / "users" / user_id / "graphs" / graph_id
    registry_path = get_data_root() / "users" / user_id / "node_registry.json"
    node_dir = get_data_root() / "users" / user_id / "nodes"

    if not graph_dir.exists():
        raise HTTPException(status_code=404, detail="Graph not found")

    # 1. Remove the graph directory
    try:
        shutil.rmtree(graph_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete graph directory: {e}")

    # 2. Update node_registry.json to remove references to this graph
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
        save_node_registry(user_id, registry)

    return JSONResponse({"status": "deleted", "graph": graph_id})
