# backend/utils/path_utils.py

from pathlib import Path

def get_graph_path(user_id: str, graph_id: str) -> str:
    return str(Path("graph_data") / "users" / user_id / "graphs" / graph_id / "graph.ndf")
