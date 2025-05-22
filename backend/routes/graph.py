from fastapi import APIRouter
from networkx.readwrite import json_graph
from core.graph_state import graph, populate_graph
import os, yaml
router = APIRouter()
GRAPH_DATA_PATH = "graph_data"

def node_path(node_id):
    return os.path.join(GRAPH_DATA_PATH, f"{node_id}.yaml")

def load_node(node_id):
    path = node_path(node_id)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Node not found")
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


@router.get("/graph")
def get_graph():
    elements = []

    for file in os.listdir(GRAPH_DATA_PATH):
        if not file.endswith(".yaml"):
            continue

        try:
            data = load_node(file[:-5])
        except Exception as e:
            print(f"❌ Error loading {file}: {e}")
            continue

        if not data or "node" not in data:
            continue

        node = data["node"]
        if not isinstance(node, dict):
            continue

        node_id = node.get("name") or node.get("id")
        if not node_id:
            print(f"⚠️ Skipping node with no name/id in {file}")
            continue

        label = node.get("label", node_id)

        elements.append({
            "data": {
                "id": node_id,
                "label": label
            }
        })

        for rel in data.get("relations", []):
            if not isinstance(rel, dict):
                print(f"⚠️ Skipping malformed relation in {file}: {rel}")
                continue

            rel_type = rel.get("name") or rel.get("type")
            target_id = rel.get("target")

            if not rel_type or not target_id:
                print(f"⚠️ Skipping incomplete relation in {file}: {rel}")
                continue

            edge_id = f"{node_id}-{rel_type}->{target_id}"

            elements.append({
                "data": {
                    "id": edge_id,
                    "source": node_id,
                    "target": target_id,
                    "label": rel_type
                }
            })

    return {"elements": elements}


