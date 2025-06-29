# backend/utils/path_utils.py

from pathlib import Path

try:
    from backend.config import get_data_root
except ImportError:
    from backend.config import get_data_root

def get_graph_path(user_id: str, graph_id: str) -> str:
    return str(get_data_root() / "users" / user_id / "graphs" / graph_id / "graph.ndf")
