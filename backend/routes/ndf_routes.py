from fastapi import APIRouter, Request, HTTPException, Body, Response
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, model_validator
import os
import yaml
from typing import List, Dict, Any
from collections import OrderedDict
from core.path_utils import get_graph_path
from core.cnl_parser import extract_cnl_blocks
from core.schema_ops import create_attribute_type_from_dict, create_relation_type_from_dict, load_schema
from core.cnl_parser import parse_logical_cnl, extract_node_sections_from_markdown, ensure_nodes_exist
from core.organize_nbh import organize_nbh
from core.ndf_ops import convert_parsed_to_nodes
from ruamel.yaml import YAML
from io import StringIO




router = APIRouter(prefix="/ndf")  # All routes prefixed with /ndf

GRAPH_BASE_PATH = "graph_data/users"  # consistent with get_graph_path


# -----------------------
# List all NDF graphs
# -----------------------
@router.get("/users/{user_id}/graphs")
def list_graphs(user_id: str):
    base_dir = os.path.join(GRAPH_BASE_PATH, user_id, "graphs")
    if not os.path.exists(base_dir):
        return []
    return [f[:-4] for f in os.listdir(base_dir) if f.endswith(".ndf")]


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


def to_ordered_node(node):
    return OrderedDict([
        ("id", node["id"]),
        ("name", node.get("name", "")),
        ("description", node.get("description", "")),
        ("attributes", node.get("attributes", [])),
        ("relations", node.get("relations", [])),
    ])

def ordered_to_plain(obj):
    if isinstance(obj, list):
        return [ordered_to_plain(i) for i in obj]
    elif isinstance(obj, dict):
        return {k: ordered_to_plain(v) for k, v in obj.items()}
    else:
        return obj

@router.put("/users/{user_id}/graphs/{graph_id}", response_class=PlainTextResponse)
async def save_ndf_graph(user_id: str, graph_id: str, request: Request):
    content = await request.body()
    graph_path = get_graph_path(user_id, graph_id)

    with open(graph_path, "wb") as f:
        f.write(content)

    return "Saved successfully"




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
    
    # Compose final document
    document = OrderedDict()
    document["mime"] = "application/x-ndf+yaml"
    document["raw_markdown"] = raw_markdown
    document["nodes"] = convert_parsed_to_nodes(parsed)
    document["relation_types"] = load_schema("relation_types.yaml", default_data=[])
    document["attribute_types"] = load_schema("attribute_types.yaml", default_data=[])

    # Convert to clean YAML string
    yaml = YAML()
    stream = StringIO()
    yaml.dump(document, stream)
    return stream.getvalue()



# -----------------------
# Internal: Update schema files
# -----------------------
def handle_define_statements(parsed_statements: List[dict]):
    for stmt in parsed_statements:
        if stmt["type"] == "define_attribute":
            create_attribute_type_from_dict(stmt)
        elif stmt["type"] == "define_relation":
            create_relation_type_from_dict(stmt)




