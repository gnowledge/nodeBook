from pathlib import Path
import yaml

from backend.core.utils import load_json_file, save_json_file
from backend.core.node_ops import load_node
from backend.core.registry import load_registry, relation_registry_path, attribute_registry_path

def compose_graph(user_id: str, graph_id: str, node_list: list, graph_description: str = None, report: dict = None) -> dict:
    """
    Compose the graph from node files and registries, and write composed.json and composed.yaml.
    Args:
        user_id: The user ID.
        graph_id: The graph ID.
        node_list: List of node IDs to include.
        graph_description: Optional description for the graph.
        report: Optional report dict to include.
    Returns:
        The composed graph dict.
    """
    composed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.json")
    composed_yaml_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.yaml")

    # Load nodes
    nodes = []
    for node_id in node_list:
        try:
            node_data = load_node(user_id, graph_id, node_id)
            nodes.append(node_data)
        except Exception as e:
            print(f"⚠️ Warning: node '{node_id}' not found or failed to load: {e}. Skipping.")

    # Load registries
    relations = list(load_registry(relation_registry_path(user_id)).values())
    attributes = list(load_registry(attribute_registry_path(user_id)).values())

    # Embed relations into each node
    node_id_to_node = {n["node_id"]: n for n in nodes if "node_id" in n}
    for rel in relations:
        source_id = rel.get("source")
        if source_id in node_id_to_node:
            node_id_to_node[source_id].setdefault("relations", []).append(rel)

    composed = {
        "graph_id": graph_id,
        "description": graph_description or "",
        "nodes": nodes,
    }
    if report is not None:
        composed["report"] = report

    save_json_file(composed_path, composed)
    with open(composed_yaml_path, "w") as f:
        yaml.safe_dump(composed, f, sort_keys=False, allow_unicode=True)
    return composed
