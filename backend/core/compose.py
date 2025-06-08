from pathlib import Path
from core.utils import load_json_file, save_json_file

def generate_composed_graph(user_id: str, graph_id: str) -> dict:
    parsed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/parsed.json")
    composed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.json")

    if not parsed_path.exists():
        raise FileNotFoundError(f"Parsed graph not found: {parsed_path}")

    parsed = load_json_file(parsed_path)
    composed = {
        "graph_id": parsed["graph_id"],
        "nodes": [],
        "relations": parsed.get("relations", []),
        "attributes": parsed.get("attributes", [])
    }

    for node_id in parsed["nodes"]:
        node_path = Path(f"data/users/{user_id}/nodes/{node_id}.json")
        if not node_path.exists():
            print(f"⚠️ Warning: node '{node_id}' not found. Skipping.")
            continue
        node_data = load_json_file(node_path)
        composed["nodes"].append(node_data)

    save_json_file(composed_path, composed)
    return composed
