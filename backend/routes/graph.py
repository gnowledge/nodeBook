from fastapi import APIRouter
from core.node_ops import load_node, safe_node_summary, safe_edge_summaries
from core.id_utils import get_graph_path
import os

router = APIRouter()

@router.get("/users/{user_id}/graphs/{graph_id}/graphdb")
def get_graph(user_id: str, graph_id: str):
    """
    Get the entire graph (nodes + relations) for a specific user's graph.
    """
    elements = []
    graph_path = get_graph_path(user_id, graph_id)
    if not os.path.exists(graph_path):
        return {"elements": []}

    for file in os.listdir(graph_path):
        if not file.endswith(".yaml"):
            continue
        node_id = file[:-5]
        summary = safe_node_summary(user_id, graph_id, file)
        if not summary:
            continue
        try:
            data = load_node(user_id, graph_id, node_id)
            node_attrs = data.get("node", {}).get("attributes", [])
            attr_dict = {a["name"]: a.get("value") for a in node_attrs if "name" in a}
        except Exception:
            attr_dict = {}
            data = {}
        node_data = {
            "id": summary["id"],
            "label": summary["label"]
        }
        if attr_dict:
            node_data["attributes"] = attr_dict
        elements.append({"data": node_data})
        try:
            elements.extend(safe_edge_summaries(summary["id"], data))
        except Exception:
            continue

    return {"elements": elements}
