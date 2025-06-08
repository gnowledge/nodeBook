from fastapi import APIRouter, Request, HTTPException, Body
from fastapi.responses import PlainTextResponse, FileResponse
from pydantic import BaseModel, model_validator
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from shutil import copyfile
import yaml
import json
from os.path import getmtime

from core.clean_cnl_payload import clean_cnl_payload
from core.path_utils import get_graph_path
from core.schema_ops import create_attribute_type_from_dict, create_relation_type_from_dict, load_schema
from core.ndf_ops import convert_parsed_to_nodes
from core.schema_utils import filter_used_schema
from core.utils import load_json_file, save_json_file
from core.cnl_parser import parse_cnl_to_parsed_json as original_parse_cnl_to_parsed_json
from core.registry import create_node_if_missing, load_node_registry, update_node_registry
from core.cnl_parser import normalize_id


router = APIRouter(prefix="/ndf")  # All routes prefixed with /api/ndf

GRAPH_BASE = Path("graph_data/users")


def ensure_all_nodes_exist(user_id: str, graph_id: str, parsed: dict):
    """
    Ensure that all nodes referenced in parsed["relations"] and parsed["attributes"] exist in registry and nodes/<id>.json
    """
    registry = load_node_registry(user_id)
    known = set(parsed["nodes"])
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

    save_json_file(Path(f"graph_data/users/{user_id}/node_registry.json"), registry)


def generate_composed_graph(user_id: str, graph_id: str) -> dict:
    base_path = Path("graph_data/users") / user_id / "graphs" / graph_id
    parsed_path = base_path / "parsed.json"
    composed_path = base_path / "composed.json"

    if not parsed_path.exists():
        raise FileNotFoundError(f"parsed.json not found for graph: {graph_id}")

    parsed = load_json_file(parsed_path)
    composed = {
        "graph_id": parsed.get("graph_id", graph_id),
        "nodes": []
    }

    for node_id in parsed["nodes"]:
        node = {
            "id": node_id,
            "name": node_id.capitalize(),  # Fallback name
            "attributes": [],
            "relations": []
        }
        # Attach all matching attributes
        for attr in parsed.get("attributes", []):
            if attr.get("target") == node_id:
                node["attributes"].append(attr)

        # Attach all matching relations where this node is the source
        for rel in parsed.get("relations", []):
            if rel.get("source") == node_id:
                node["relations"].append(rel)

        composed["nodes"].append(node)

    save_json_file(composed_path, composed)

    # Also write parsed.yaml from parsed.json
    import yaml
    parsed_yaml_path = base_path / "parsed.yaml"
    with parsed_yaml_path.open("w") as f:
        yaml.dump(parsed, f, sort_keys=False)
        # Optional: Update each node's own JSON file with NBH
    node_dir = Path("graph_data/users") / user_id / "nodes"
    node_dir.mkdir(parents=True, exist_ok=True)
    for node in composed["nodes"]:
        node_path = node_dir / f"{node['id']}.json"
        node_data = {
            "id": node["id"],
            "name": node["name"],
            "attributes": node.get("attributes", []),
            "relations": node.get("relations", [])
        }
        save_json_file(node_path, node_data)

    return composed

@router.put("/users/{user_id}/graphs/{graph_id}/cnl")
def save_cnl(user_id: str, graph_id: str, body: str = Body(..., media_type="text/plain")):
    cleaned = clean_cnl_payload(body)
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    cnl_path.write_text(cleaned, encoding="utf-8")
    return {"status": "ok"}


@router.post("/users/{user_id}/graphs/{graph_id}/parse")
def parse_graph(user_id: str, graph_id: str):
    from core.utils import load_text_file
    from core.cnl_parser import extract_node_sections_from_markdown, parse_logical_cnl, normalize_id

    graph_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.json"

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

    for section in sections:
        node_id = normalize_id(section["id"])
        parsed["nodes"].append(node_id)

        create_node_if_missing(user_id, node_id, name=section["id"])
        update_node_registry(registry, node_id, graph_id)

        facts = parse_logical_cnl(section["cnl"], subject=node_id)

        print(f"📦 Node: {node_id} — Found {len(facts)} facts")

        for fact in facts:
            if fact["type"] == "relation":
                parsed["relations"].append({
                    "name": fact["name"],
                    "source": fact["subject"],
                    "target": fact["object"]
                })
            elif fact["type"] == "attribute":
                parsed["attributes"].append({
                    "name": fact["name"],
                    "value": fact["value"],
                    "unit": fact.get("unit", ""),
                    "target": fact["target"]
                })

    save_json_file(GRAPH_BASE / user_id / "node_registry.json", registry)
    ensure_all_nodes_exist(user_id, graph_id, parsed)
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
        create_node_if_missing(user_id, node_id, name=node_id.capitalize())
        update_node_registry(registry, node_id, graph_id)

    try:
        composed = generate_composed_graph(user_id, graph_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Parsed but failed to generate composed.json: {e}")

    return parsed


@router.get("/users/{user_id}/graphs/{graph_id}/parsed")
async def get_parsed_yaml(user_id: str, graph_id: str):
    parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.yaml"
    if not parsed_path.exists():
        raise HTTPException(status_code=404, detail="parsed.yaml not found")

    return FileResponse(parsed_path, media_type="text/plain")


@router.get("/users/{user_id}/graphs/{graph_id}/composed.yaml")
async def get_composed_yaml(user_id: str, graph_id: str):
    composed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "composed.json"
    if not composed_path.exists():
        raise HTTPException(status_code=404, detail="composed.json not found")

    data = load_json_file(composed_path)
    yaml_text = yaml.dump(data, sort_keys=False, allow_unicode=True)
    return PlainTextResponse(content=yaml_text, media_type="text/plain")


@router.get("/users/{user_id}/graphs/{graph_id}/graph")
def get_cytoscape_graph(user_id: str, graph_id: str):
    graph_dir = GRAPH_BASE / user_id / "graphs" / graph_id
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
    base_dir = GRAPH_BASE / user_id / "graphs"
    if not base_dir.exists():
        return []
    return [f.name for f in base_dir.iterdir() if f.is_dir()]


@router.get("/users/{user_id}/graphs/{graph_id}/cnl")
def get_cnl_block(user_id: str, graph_id: str):
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    if not cnl_path.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")
    return cnl_path.read_text()


@router.get("/users/{user_id}/graphs/{graph_id}/raw")
async def get_graph_raw(user_id: str, graph_id: str):
    graph_file = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    if not graph_file.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")
    return graph_file.read_text()


class GraphInitRequest(BaseModel):
    title: str
    description: str = ""


@router.post("/users/{user_id}/graphs/{graph_id}")
async def create_graph(user_id: str, graph_id: str, req: GraphInitRequest):
    graph_dir = GRAPH_BASE / user_id / "graphs" / graph_id
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
    metadata_path = GRAPH_BASE / user_id / "graphs" / graph_id / "metadata.yaml"
    if not metadata_path.exists():
        raise HTTPException(status_code=404, detail="metadata.yaml not found")
    return FileResponse(metadata_path, media_type="text/plain")
