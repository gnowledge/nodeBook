from fastapi import APIRouter
from networkx.readwrite import json_graph
from core.graph_state import graph, populate_graph
import os, yaml
router = APIRouter()
GRAPH_DATA_PATH = "graph_data"
from core.node_ops import node_path, load_node, safe_node_summary, safe_edge_summaries



@router.get("/graph")
def get_graph():
    """
    Get the entire graph as a list of node and edge elements.

    Returns:
        {
            "elements": [
                {
                    "data": {
                        "id": "node_id",
                        "label": "Node Label",
                        "attributes": {
                            "attr1": "value1",
                            ...
                        }
                    }
                },
                {
                    "data": {
                        "id": "edge_id",
                        "source": "source_node_id",
                        "target": "target_node_id",
                        "name": "relation_type",
                        ... // other edge properties
                    }
                },
                ...
            ]
        }
    """
    elements = []

    for file in os.listdir(GRAPH_DATA_PATH):
        if file.endswith(".yaml"):
            summary = safe_node_summary(file)
            if not summary:
                continue

            # Load full node data to extract attributes
            try:
                data = load_node(file[:-5])
                node_attrs = data.get("node", {}).get("attributes", [])
                # Compose attributes as a dict: {name: value, ...}
                attr_dict = {a["name"]: a.get("value") for a in node_attrs if "name" in a}
            except Exception:
                attr_dict = {}

            # Node element with attributes
            node_data = {
                "id": summary["id"],
                "label": summary["label"]
            }
            if attr_dict:
                node_data["attributes"] = attr_dict

            elements.append({
                "data": node_data
            })

            # Edge elements
            try:
                data = load_node(file[:-5])
                elements.extend(safe_edge_summaries(summary["id"], data))
            except:
                continue

    return {"elements": elements}



