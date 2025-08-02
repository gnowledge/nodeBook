from backend.core.locking import file_lock
from backend.core.atomic_ops import save_json_file_atomic, load_json_file
from pathlib import Path
import shutil
import yaml
import json
from datetime import datetime

def get_node_path(user_id: str, node_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")

def get_node_lock_path(user_id: str, node_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/nodes/{node_id}.json.lock")

def create_node(user_id: str, node_id: str, node_data: dict):
    node_path = get_node_path(user_id, node_id)
    lock_path = get_node_lock_path(user_id, node_id)
    with file_lock(lock_path):
        save_json_file_atomic(node_path, node_data)

def read_node(user_id: str, node_id: str) -> dict:
    node_path = get_node_path(user_id, node_id)
    lock_path = get_node_lock_path(user_id, node_id)
    with file_lock(lock_path):
        return load_json_file(node_path)

def update_node(user_id: str, node_id: str, node_data: dict):
    node_path = get_node_path(user_id, node_id)
    lock_path = get_node_lock_path(user_id, node_id)
    with file_lock(lock_path):
        save_json_file_atomic(node_path, node_data)

def delete_node(user_id: str, node_id: str):
    node_path = get_node_path(user_id, node_id)
    lock_path = get_node_lock_path(user_id, node_id)
    with file_lock(lock_path):
        if node_path.exists():
            node_path.unlink()

def get_relation_path(user_id: str, relation_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/relationNodes/{relation_id}.json")

def get_relation_lock_path(user_id: str, relation_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/relationNodes/{relation_id}.json.lock")

def create_relation(user_id: str, relation_id: str, relation_data: dict):
    relation_path = get_relation_path(user_id, relation_id)
    lock_path = get_relation_lock_path(user_id, relation_id)
    with file_lock(lock_path):
        save_json_file_atomic(relation_path, relation_data)

def read_relation(user_id: str, relation_id: str) -> dict:
    relation_path = get_relation_path(user_id, relation_id)
    lock_path = get_relation_lock_path(user_id, relation_id)
    with file_lock(lock_path):
        return load_json_file(relation_path)

def update_relation(user_id: str, relation_id: str, relation_data: dict):
    relation_path = get_relation_path(user_id, relation_id)
    lock_path = get_relation_lock_path(user_id, relation_id)
    with file_lock(lock_path):
        save_json_file_atomic(relation_path, relation_data)

def delete_relation(user_id: str, relation_id: str):
    relation_path = get_relation_path(user_id, relation_id)
    lock_path = get_relation_lock_path(user_id, relation_id)
    with file_lock(lock_path):
        if relation_path.exists():
            relation_path.unlink()

def get_attribute_path(user_id: str, attribute_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/attributeNodes/{attribute_id}.json")

def get_attribute_lock_path(user_id: str, attribute_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/attributeNodes/{attribute_id}.json.lock")

def create_attribute(user_id: str, attribute_id: str, attribute_data: dict):
    attribute_path = get_attribute_path(user_id, attribute_id)
    lock_path = get_attribute_lock_path(user_id, attribute_id)
    with file_lock(lock_path):
        save_json_file_atomic(attribute_path, attribute_data)

def read_attribute(user_id: str, attribute_id: str) -> dict:
    attribute_path = get_attribute_path(user_id, attribute_id)
    lock_path = get_attribute_lock_path(user_id, attribute_id)
    with file_lock(lock_path):
        return load_json_file(attribute_path)

def update_attribute(user_id: str, attribute_id: str, attribute_data: dict):
    attribute_path = get_attribute_path(user_id, attribute_id)
    lock_path = get_attribute_lock_path(user_id, attribute_id)
    with file_lock(lock_path):
        save_json_file_atomic(attribute_path, attribute_data)

def delete_attribute(user_id: str, attribute_id: str):
    attribute_path = get_attribute_path(user_id, attribute_id)
    lock_path = get_attribute_lock_path(user_id, attribute_id)
    with file_lock(lock_path):
        if attribute_path.exists():
            attribute_path.unlink()

def get_registry_path(user_id: str, registry_type: str) -> Path:
    if user_id == "global":
        return Path(f"graph_data/global/{registry_type}.json")
    return Path(f"graph_data/users/{user_id}/{registry_type}_registry.json")

def get_registry_lock_path(user_id: str, registry_type: str) -> Path:
    if user_id == "global":
        return Path(f"graph_data/global/{registry_type}.json.lock")
    return Path(f"graph_data/users/{user_id}/{registry_type}_registry.json.lock")

def load_registry(user_id: str, registry_type: str) -> dict:
    registry_path = get_registry_path(user_id, registry_type)
    lock_path = get_registry_lock_path(user_id, registry_type)
    with file_lock(lock_path):
        return load_json_file(registry_path)

def save_registry(user_id: str, registry_type: str, registry_data: dict):
    registry_path = get_registry_path(user_id, registry_type)
    lock_path = get_registry_lock_path(user_id, registry_type)
    with file_lock(lock_path):
        save_json_file_atomic(registry_path, registry_data)

def get_graph_path(user_id: str, graph_id: str) -> Path:
    return Path(f"graph_data/users/{user_id}/graphs/{graph_id}")

def create_graph(user_id: str, graph_id: str, title: str, description: str):
    graph_dir = get_graph_path(user_id, graph_id)
    if graph_dir.exists():
        raise FileExistsError(f"Graph '{graph_id}' already exists for user '{user_id}'")

    graph_dir.mkdir(parents=True)

    template_dir = Path("graph_data/global/templates/defaultGraphFiles")

    for fname in ["CNL.md", "composed.json", "composed.yaml", "metadata.yaml"]:
        src = template_dir / fname
        dest = graph_dir / fname
        if not src.exists():
            raise FileNotFoundError(f"Template file missing: {fname}")
        shutil.copyfile(src, dest)

    poly_path = graph_dir / "polymorphic_composed.json"
    if not poly_path.exists():
        with open(poly_path, "w") as f:
            json.dump([], f)

    metadata_path = graph_dir / "metadata.yaml"
    if metadata_path.exists():
        metadata = yaml.safe_load(metadata_path.read_text()) or {}
        metadata["title"] = title
        metadata["description"] = description
        timestamp = datetime.utcnow().isoformat()
        metadata["created"] = metadata.get("created", timestamp)
        metadata["modified"] = timestamp
        
        with metadata_path.open("w") as f:
            yaml.dump(metadata, f, sort_keys=False)

def read_cnl(user_id: str, graph_id: str) -> str:
    cnl_path = get_graph_path(user_id, graph_id) / "CNL.md"
    if not cnl_path.exists():
        raise FileNotFoundError(f"CNL.md not found for graph '{graph_id}'")
    return cnl_path.read_text()

def read_composed(user_id: str, graph_id: str, format_type: str) -> dict:
    if format_type == "json":
        composed_path = get_graph_path(user_id, graph_id) / "composed.json"
    elif format_type == "yaml":
        composed_path = get_graph_path(user_id, graph_id) / "composed.yaml"
    elif format_type == "polymorphic":
        composed_path = get_graph_path(user_id, graph_id) / "polymorphic_composed.json"
    else:
        raise ValueError(f"Invalid composed format type: {format_type}")

    if not composed_path.exists():
        raise FileNotFoundError(f"Composed file not found for graph '{graph_id}'")

    with file_lock(str(composed_path) + ".lock"):
        return load_json_file(composed_path)

def list_graphs(user_id: str) -> list[str]:
    base_dir = Path(f"graph_data/users/{user_id}/graphs")
    if not base_dir.exists():
        return []
    return [f.name for f in base_dir.iterdir() if f.is_dir()]

def delete_graph(user_id: str, graph_id: str):
    graph_dir = Path(f"graph_data/users/{user_id}/graphs/{graph_id}")
    node_dir = Path(f"graph_data/users/{user_id}/nodes")
    relation_dir = Path(f"graph_data/users/{user_id}/relationNodes")
    attribute_dir = Path(f"graph_data/users/{user_id}/attributeNodes")

    if not graph_dir.exists():
        raise FileNotFoundError(f"Graph '{graph_id}' not found for user '{user_id}'")

    # 1. Remove the graph directory
    shutil.rmtree(graph_dir)

    # 2. Update node_registry.json to remove references to this graph
    registry = load_registry(user_id, "node")
    changed = False
    for node_id, entry in list(registry.items()):
        if "graphs" in entry and graph_id in entry["graphs"]:
            entry["graphs"].remove(graph_id)
            changed = True
        # If node is now orphaned (no graphs), delete node file and remove from registry
        if not entry.get("graphs"):
            node_path = node_dir / f"{node_id}.json"
            if node_path.exists():
                node_path.unlink()
            del registry[node_id]
            changed = True
    if changed:
        save_registry(user_id, "node", registry)

    # 3. Clean up relationNodes that belong only to this graph
    relation_registry = load_registry(user_id, "relation")
    relation_changed = False
    for rel_id, entry in list(relation_registry.items()):
        if "graphs" in entry and graph_id in entry["graphs"]:
            entry["graphs"].remove(graph_id)
            # If relation is now orphaned (no graphs), delete it
            if not entry["graphs"]:
                rel_path = relation_dir / f"{rel_id}.json"
                if rel_path.exists():
                    rel_path.unlink()
                del relation_registry[rel_id]
            relation_changed = True
    if relation_changed:
        save_registry(user_id, "relation", relation_registry)

    # 4. Clean up attributeNodes that belong only to this graph
    attribute_registry = load_registry(user_id, "attribute")
    attribute_changed = False
    for attr_id, entry in list(attribute_registry.items()):
        if "graphs" in entry and graph_id in entry["graphs"]:
            entry["graphs"].remove(graph_id)
            # If attribute is now orphaned (no graphs), delete it
            if not entry["graphs"]:
                attr_path = attribute_dir / f"{attr_id}.json"
                if attr_path.exists():
                    attr_path.unlink()
                del attribute_registry[attr_id]
            attribute_changed = True
    if attribute_changed:
        save_registry(user_id, "attribute", attribute_registry)

