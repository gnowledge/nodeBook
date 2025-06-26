import os


def normalize_id(label: str) -> str:
    """Normalize a human-readable label to a safe, file-friendly node ID."""
    return label.strip().lower().replace(" ", "_")

def normalize_uuid(uuid_str: str) -> str:
    """Normalize UUID string by removing hyphens for consistent comparison"""
    return uuid_str.replace('-', '') if uuid_str else uuid_str

def get_user_directory_path(user_id: str) -> str:
    """
    Get the correct user directory path, handling both UUID formats.
    FastAPI Users creates directories with hyphens, but database stores without hyphens.
    This function tries both formats to find the correct directory.
    """
    base_path = os.path.join("graph_data", "users")
    
    # Try the original format first (with hyphens)
    path_with_hyphens = os.path.join(base_path, user_id)
    if os.path.exists(path_with_hyphens):
        return path_with_hyphens
    
    # Try normalized format (without hyphens)
    normalized_user_id = normalize_uuid(user_id)
    path_without_hyphens = os.path.join(base_path, normalized_user_id)
    if os.path.exists(path_without_hyphens):
        return path_without_hyphens
    
    # If neither exists, return the original format (FastAPI Users will create it)
    return path_with_hyphens

def get_graph_path(user_id: str, graph_id: str) -> str:
    base = get_user_directory_path(user_id)
    graph_path = os.path.join(base, "graphs", graph_id)
    # No trailing slash needed; os.path.join handles paths correctly.
    if not os.path.exists(graph_path):
        raise FileNotFoundError(f"Graph '{graph_id}' for user '{user_id}' not found.")
    return graph_path

def get_user_id(user_id=None):
    return user_id or "user0"