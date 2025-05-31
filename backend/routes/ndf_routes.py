from fastapi import APIRouter, Request, HTTPException, Body
from fastapi.responses import PlainTextResponse, FileResponse
from pydantic import BaseModel, model_validator
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any
from collections import OrderedDict
import os
import yaml
from ruamel.yaml import YAML
from io import StringIO
#from core.cnl_parser import parse_logical_cnl, build_nbh_with_networkx

import re
import networkx as nx

from core.clean_cnl_payload import clean_cnl_payload
from core.path_utils import get_graph_path
#from core.cnl_parser import extract_cnl_blocks, parse_logical_cnl, extract_node_sections_from_markdown, ensure_nodes_exist
from core.schema_ops import create_attribute_type_from_dict, create_relation_type_from_dict, load_schema
from core.organize_nbh import organize_nbh
from core.ndf_ops import convert_parsed_to_nodes
from core.schema_utils import filter_used_schema

router = APIRouter(prefix="/ndf")  # All routes prefixed with /api/ndf

GRAPH_BASE = Path("graph_data/users")


@router.put("/users/{user_id}/graphs/{graph_id}/cnl")
def save_cnl(user_id: str, graph_id: str, body: str = Body(..., media_type="text/plain")):
    cleaned = clean_cnl_payload(body)
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    cnl_path.write_text(cleaned, encoding="utf-8")
    return {"status": "ok"}



def parse_logical_cnl(raw_md):
    entries = []
    current_node = None

    sections = re.split(r'^# (.+)$', raw_md, flags=re.MULTILINE)
    if sections[0].strip():
        entries.append({
            "type": "document",
            "description": sections[0].strip()
        })

    for i in range(1, len(sections), 2):
        node_id = sections[i].strip()
        content = sections[i + 1].strip()
        current_node = node_id
        entries.append({
            "type": "node",
            "id": node_id,
            "description": ""
        })

        block_pattern = re.compile(r':::cnl\s*\n?(.*?)\n?:::', flags=re.DOTALL)
        cnl_blocks = block_pattern.findall(content)

        description = block_pattern.sub('', content).strip()
        if description:
            entries[-1]["description"] = description

        for block in cnl_blocks:
            for line in block.strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                # New attribute format: has name: value (unit)
                if line.startswith("has "):
                    m = re.match(r'has ([a-zA-Z0-9_ ]+): ([^()]+)(?:\(([^()]+)\))?', line)
                    if m:
                        name, value, unit = m.groups()
                        entries.append({
                            "type": "attribute",
                            "subject": current_node,
                            "name": name.strip(),
                            "value": value.strip(),
                            "unit": unit.strip() if unit else ""
                        })
                elif line.startswith("<"):
                    m = re.match(r'<(.*?)> (.*)', line)
                    if m:
                        rel, obj = m.groups()
                        entries.append({
                            "type": "relation",
                            "subject": current_node,
                            "name": rel.strip(),
                            "object": obj.strip()
                        })
    return entries


def build_nbh_with_networkx(flat_entries):
    G = nx.MultiDiGraph()
    node_descriptions = {}
    node_attributes = {}

    for entry in flat_entries:
        if entry["type"] == "node":
            G.add_node(entry["id"])
            node_descriptions[entry["id"]] = entry.get("description", "")
        elif entry["type"] == "attribute":
            subj = entry["subject"]
            if subj not in node_attributes:
                node_attributes[subj] = []
            node_attributes[subj].append({
                "name": entry["name"],
                "value": entry["value"],
                "unit": entry["unit"]
            })
        elif entry["type"] == "relation":
            G.add_edge(entry["subject"], entry["object"], key=entry["name"], label=entry["name"])

    output = {"nodes": []}
    for node_id in G.nodes:
        node_data = {
            "id": node_id,
            "description": node_descriptions.get(node_id, ""),
            "attributes": node_attributes.get(node_id, []),
            "relations": []
        }
        for source, target, key, edge_data in G.out_edges(node_id, keys=True, data=True):
            node_data["relations"].append({
                "name": edge_data["label"],
                "source": source,
                "target": target
            })
        output["nodes"].append(node_data)

    return output

@router.post("/users/{user_id}/graphs/{graph_id}/parse")
def parse_graph(user_id: str, graph_id: str):
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.yaml"

    print(f"[DEBUG] Reading cnl.md from: {cnl_path}")
    if not cnl_path.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")

    raw = cnl_path.read_text(encoding="utf-8")
    print(f"[DEBUG] Raw content (first 200 chars):\n{raw[:200]}")

    flat_list = parse_logical_cnl(raw)
    print(f"[DEBUG] Flat entries extracted: {len(flat_list)}")
    if flat_list:
        print(f"[DEBUG] First entry: {flat_list[0]}")

    structured = build_nbh_with_networkx(flat_list)
    print(f"[DEBUG] Nodes parsed: {len(structured['nodes'])}")

    parsed_path.write_text(yaml.dump(structured, sort_keys=False), encoding="utf-8")
    print(f"[DEBUG] Parsed YAML written to: {parsed_path}")

    return structured


# -----------------------
# Load CNL block
# -----------------------
@router.get("/users/{user_id}/graphs/{graph_id}/cnl")
def get_cnl_block(user_id: str, graph_id: str):
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    if not cnl_path.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")
    return cnl_path.read_text()

# -----------------------
# Parse CNL and produce parsed.yaml
# -----------------------



@router.get("/users/{user_id}/graphs/{graph_id}/parsed")
async def get_parsed_yaml(user_id: str, graph_id: str):
    parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.yaml"
    if not parsed_path.exists():
        raise HTTPException(status_code=404, detail="parsed.yaml not found")
    return FileResponse(parsed_path, media_type="text/plain")





# -----------------------
# Return Cytoscape-compatible graph data
# -----------------------
@router.get("/users/{user_id}/graphs/{graph_id}/graph")
def get_cytoscape_graph(user_id: str, graph_id: str):
    parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.yaml"
    if not parsed_path.exists():
        raise HTTPException(status_code=404, detail="parsed.yaml not found")

    parsed = yaml.safe_load(parsed_path)

    nodes = [
        {
            "data": {
                "id": n["id"],
                "label": n.get("name", n["id"]),
                "description": n.get("description", "")
            }
        }
        for n in parsed.get("nodes", [])
    ]

    edges = [
        {
            "data": {
                "id": f"{n['id']}_{r['name']}_{r['target']}_{i}",
                "source": n["id"],
                "target": r["target"],
                "label": r["name"]
            }
        }
        for n in parsed.get("nodes", [])
        for i, r in enumerate(n.get("relations", []))
    ]

    return {"nodes": nodes, "edges": edges}




# -----------------------
# List all NDF graphs
# -----------------------
@router.get("/users/{user_id}/graphs")
def list_graphs(user_id: str):
    base_dir = GRAPH_BASE / user_id / "graphs"
    if not base_dir.exists():
        return []
    return [f.name for f in base_dir.iterdir() if f.is_dir()]



# -----------------------
# Load a specific .ndf file
# -----------------------
@router.get("/users/{user_id}/graphs/{graph_id}")
def load_ndf_graph(user_id: str, graph_id: str):
    graph_path = get_graph_path(user_id, graph_id)
    if not os.path.exists(graph_path):
        raise HTTPException(status_code=404, detail="Graph not found")
    with open(graph_path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


# -----------------------
# Save (overwrite) an .ndf file
# -----------------------
@router.put("/users/{user_id}/graphs/{graph_id}", response_class=PlainTextResponse)
async def save_ndf_graph(user_id: str, graph_id: str, request: Request):
    content = await request.body()
    graph_path = get_graph_path(user_id, graph_id)

    with open(graph_path, "wb") as f:
        f.write(content)

    return "Saved successfully"


# -----------------------
# Return raw markdown content
# -----------------------
@router.get("/users/{user_id}/graphs/{graph_id}/raw")
async def get_graph_raw(user_id: str, graph_id: str):
    graph_file = GRAPH_BASE / user_id / "graphs" / graph_id / "graph.ndf"
    if not graph_file.exists():
        raise HTTPException(status_code=404, detail="graph.ndf not found")
    return graph_file.read_text()


# -----------------------
# Parse CNL from raw markdown and update schema
# -----------------------
class MarkdownInput(BaseModel):
    raw_markdown: str | None = None
    text: str | None = None

    @model_validator(mode="before")
    @classmethod
    def move_text_to_raw(cls, data):
        if "raw_markdown" not in data and "text" in data:
            data["raw_markdown"] = data["text"]
        return data


@router.post("/parse-markdown", response_class=PlainTextResponse)
def parse_markdown_route(data: dict = Body(...)):
    raw_markdown = data.get("raw_markdown", "")
    parsed = parse_logical_cnl(raw_markdown)

    document = OrderedDict()
    document["mime"] = "application/x-ndf+yaml"
    document["raw_markdown"] = raw_markdown
    document["nodes"] = convert_parsed_to_nodes(parsed)
    document["relation_types"] = load_schema("relation_types.yaml", default_data=[])
    document["attribute_types"] = load_schema("attribute_types.yaml", default_data=[])

    yaml_writer = YAML()
    stream = StringIO()
    yaml_writer.dump(document, stream)

    return PlainTextResponse(content=stream.getvalue())


# -----------------------
# Internal: Update schema files
# -----------------------
def handle_define_statements(parsed_statements: List[dict]):
    for stmt in parsed_statements:
        if stmt["type"] == "define_attribute":
            create_attribute_type_from_dict(stmt)
        elif stmt["type"] == "define_relation":
            create_relation_type_from_dict(stmt)


# -----------------------
# Create a new graph with default files
# -----------------------
class GraphInitRequest(BaseModel):
    title: str
    description: str = ""


from shutil import copyfile

@router.post("/users/{user_id}/graphs/{graph_id}")
async def create_graph(user_id: str, graph_id: str, req: GraphInitRequest):
    graph_dir = GRAPH_BASE / user_id / "graphs" / graph_id
    template_dir = Path("graph_data/global/templates/defaultFiles")

    if graph_dir.exists():
        raise HTTPException(status_code=400, detail="Graph already exists")

    try:
        graph_dir.mkdir(parents=True)

        # Copy template files
        for fname in ["cnl.md", "parsed.yaml", "metadata.yaml"]:
            src = template_dir / fname
            dest = graph_dir / fname
            if not src.exists():
                raise HTTPException(status_code=500, detail=f"Template file missing: {fname}")
            copyfile(src, dest)

        # Optional: update metadata.yaml with title/description
        metadata_path = graph_dir / "metadata.yaml"
        if metadata_path.exists():
            metadata = yaml.safe_load(metadata_path.read_text())
            metadata["title"] = req.title
            metadata["description"] = req.description
            metadata["modified"] = datetime.utcnow().isoformat()
            metadata["created"] = datetime.utcnow().isoformat()
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
