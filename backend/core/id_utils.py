import os


def normalize_id(label: str) -> str:
    """Normalize a human-readable label to a safe, file-friendly node ID."""
    return label.strip().lower().replace(" ", "_")

def get_graph_path(user_id: str, graph_id: str) -> str:
    base = os.path.join("graph_data", "users", user_id, "graphs", graph_id)
    # No trailing slash needed; os.path.join handles paths correctly.
    if not os.path.exists(base):
        raise FileNotFoundError(f"Graph '{graph_id}' for user '{user_id}' not found.")
    return base

def get_user_id(user_id=None):
    return user_id or "user0"