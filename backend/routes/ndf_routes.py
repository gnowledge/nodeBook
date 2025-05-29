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


from core.path_utils import get_graph_path
from core.cnl_parser import extract_cnl_blocks, parse_logical_cnl, extract_node_sections_from_markdown, ensure_nodes_exist
from core.schema_ops import create_attribute_type_from_dict, create_relation_type_from_dict, load_schema
from core.organize_nbh import organize_nbh
from core.ndf_ops import convert_parsed_to_nodes
from core.schema_utils import filter_used_schema

router = APIRouter(prefix="/ndf")  # All routes prefixed with /api/ndf

GRAPH_BASE = Path("graph_data/users")



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
# Save CNL block
# -----------------------
# @router.put("/users/{user_id}/graphs/{graph_id}/cnl")
# async def save_cnl(user_id: str, graph_id: str, data: dict):
#     raw_markdown = data.get("raw_markdown", "")
#     # optional normalization
#     raw_markdown = raw_markdown.replace("\r\n", "\n").replace("\r", "\n")
#     save_to_file(user_id, graph_id, raw_markdown)
#     return {"status": "saved"}



@router.put("/users/{user_id}/graphs/{graph_id}/cnl")
def save_cnl_block(user_id: str, graph_id: str, content: str = Body(...)):
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    cnl_path.parent.mkdir(parents=True, exist_ok=True)
    cnl_path.write_text(content, encoding="utf-8")
    return {"status": "saved", "path": str(cnl_path)}

# -----------------------
# Parse CNL and produce parsed.yaml
# -----------------------

@router.post("/users/{user_id}/graphs/{graph_id}/parse")
def parse_graph(user_id: str, graph_id: str):
    cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
    parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.yaml"

    if not cnl_path.exists():
        raise HTTPException(status_code=404, detail="cnl.md not found")

    raw = cnl_path.read_text()
    parsed = parse_logical_cnl(raw)       # flat list: node, relation, attribute
    structured = {"nodes": organize_nbh(parsed)}  # embed relations and attributes

    with parsed_path.open("w") as f:
        yaml.dump(structured, f, sort_keys=False)

    return structured

# @router.post("/users/{user_id}/graphs/{graph_id}/parse")
# def parse_graph(user_id: str, graph_id: str):
#     cnl_path = GRAPH_BASE / user_id / "graphs" / graph_id / "cnl.md"
#     parsed_path = GRAPH_BASE / user_id / "graphs" / graph_id / "parsed.yaml"

#     if not cnl_path.exists():
#         raise HTTPException(status_code=404, detail="cnl.md not found")

#     raw = cnl_path.read_text()
#     parsed = parse_logical_cnl(raw)

#     with parsed_path.open("w") as f:
#         yaml.dump(parsed, f, sort_keys=False)

#     # Filter schema from parsed.yaml
#     filter_used_schema(
#         parsed_yaml_path=parsed_path,
#         relation_schema_path="schema/relation_types.yaml",
#         attribute_schema_path="schema/attribute_types.yaml",
#         output_path=GRAPH_BASE / user_id / "graphs" / graph_id / "used_schema.yaml"
#     )
#     return parsed


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

@router.post("/users/{user_id}/graphs/{graph_id}")
async def create_graph(user_id: str, graph_id: str, req: GraphInitRequest):
    graph_dir = GRAPH_BASE / user_id / "graphs" / graph_id

    if graph_dir.exists():
        raise HTTPException(status_code=400, detail="Graph already exists")

    try:
        graph_dir.mkdir(parents=True)

        timestamp = datetime.utcnow().isoformat()

        # Write graph.ndf
        ndf_content = f"""% ndformat 0.1

# graph_metadata

```cnl
title is "{req.title}";
created is {timestamp};
modified is {timestamp};
```

# example_node

This is a sample node in your graph.

```cnl
example_node is a concept;
example_node has description "This is a sample node to show how CNL works.";
```
"""
        (graph_dir / "graph.ndf").write_text(ndf_content)

        # Write parsed.yaml
        parsed = {
            "nodes": [
                {
                    "id": "example_node",
                    "name": "example_node",
                    "role": "class",
                    "description": "This is a sample node to show how CNL works.",
                    "attributes": [
                        {"name": "description", "value": "This is a sample node to show how CNL works."}
                    ]
                }
            ],
            "relations": [
                {"name": "is_a", "source": "example_node", "target": "concept"}
            ]
        }
        with (graph_dir / "parsed.yaml").open("w") as f:
            yaml.dump(parsed, f, sort_keys=False)

        # Write metadata.yaml
        metadata = {
            "title": req.title,
            "description": req.description,
            "created": timestamp,
            "modified": timestamp
        }
        with (graph_dir / "metadata.yaml").open("w") as f:
            yaml.dump(metadata, f, sort_keys=False)

        return {"status": "created", "graph": graph_id}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating graph: {e}")
