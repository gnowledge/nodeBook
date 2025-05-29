# backend/utils/path_utils.py

def get_graph_path(user_id: str, graph_id: str) -> str:
    return f"graph_data/{user_id}/{graph_id}.ndf"
