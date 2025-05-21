from fastapi import APIRouter
from networkx.readwrite import json_graph
from core.graph_state import graph, populate_graph

router = APIRouter()

@router.get("/graph")
def get_graph():
    if graph.number_of_nodes() == 0:
        populate_graph()

    data = json_graph.node_link_data(graph)
    elements = []

    for node in data["nodes"]:
        elements.append({
            "data": {
                "id": node["id"],
                "label": node.get("label", node["id"])
            }
        })

    for edge in data["links"]:
        eid = f"{edge['source']}-{edge.get('label', '')}->{edge['target']}"
        elements.append({
            "data": {
                "id": eid,
                "source": edge["source"],
                "target": edge["target"],
                "label": edge.get("label", "")
            }
        })

    return {"elements": elements}
