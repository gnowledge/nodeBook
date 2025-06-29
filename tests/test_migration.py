#!/usr/bin/env python3

import sys
import os
sys.path.append('backend')

from backend.core.utils import load_json_file, save_json_file
from backend.config import get_data_root

def migrate_registries_to_include_graphs(user_id: str, graph_id: str):
    """
    Migrate existing relation and attribute registries to include graphs field.
    This ensures backward compatibility with existing data.
    """
    # Migrate relation registry
    relation_registry_path = get_data_root() / "users" / user_id / "relation_registry.json"
    if relation_registry_path.exists():
        print(f"Migrating relation registry: {relation_registry_path}")
        relation_registry = load_json_file(relation_registry_path)
        relation_changed = False
        for rel_id, entry in relation_registry.items():
            if "graphs" not in entry:
                entry["graphs"] = [graph_id]  # Assume it belongs to the current graph
                relation_changed = True
                print(f"  Added graphs field to relation: {rel_id}")
        if relation_changed:
            save_json_file(relation_registry_path, relation_registry)
            print(f"  Saved updated relation registry")
        else:
            print(f"  No changes needed for relation registry")
    else:
        print(f"Relation registry not found: {relation_registry_path}")
    
    # Migrate attribute registry
    attribute_registry_path = get_data_root() / "users" / user_id / "attribute_registry.json"
    if attribute_registry_path.exists():
        print(f"Migrating attribute registry: {attribute_registry_path}")
        attribute_registry = load_json_file(attribute_registry_path)
        attribute_changed = False
        for attr_id, entry in attribute_registry.items():
            if "graphs" not in entry:
                entry["graphs"] = [graph_id]  # Assume it belongs to the current graph
                attribute_changed = True
                print(f"  Added graphs field to attribute: {attr_id}")
        if attribute_changed:
            save_json_file(attribute_registry_path, attribute_registry)
            print(f"  Saved updated attribute registry")
        else:
            print(f"  No changes needed for attribute registry")
    else:
        print(f"Attribute registry not found: {attribute_registry_path}")

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python test_migration.py <user_id> <graph_id>")
        sys.exit(1)
    
    user_id = sys.argv[1]
    graph_id = sys.argv[2]
    
    print(f"Testing migration for user: {user_id}, graph: {graph_id}")
    migrate_registries_to_include_graphs(user_id, graph_id)
    print("Migration completed!") 