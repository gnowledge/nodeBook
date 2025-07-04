#!/usr/bin/env python3
"""
Script to migrate transition registry from list format to dict format with graph tracking.
"""

import json
import os
from pathlib import Path

def migrate_transition_registry(user_id: str, graph_id: str):
    """Migrate transition registry from list to dict format with graph tracking."""
    
    # Path to the transition registry
    registry_path = Path(f"graph_data/users/{user_id}/transition_registry.json")
    
    if not registry_path.exists():
        print(f"Transition registry not found at {registry_path}")
        return
    
    # Load the old registry (list format)
    with open(registry_path, 'r') as f:
        old_registry = json.load(f)
    
    if not isinstance(old_registry, list):
        print("Registry is already in dict format or invalid format")
        return
    
    print(f"Migrating {len(old_registry)} transitions for user {user_id}...")
    
    # Convert to new dict format
    new_registry = {}
    for transition in old_registry:
        transition_id = transition.get('id', 'unknown')
        new_registry[transition_id] = {
            **transition,
            'graphs': [graph_id],  # Add the graph this transition belongs to
            'created_at': '2025-01-01T00:00:00',  # Add timestamp
            'updated_at': '2025-01-01T00:00:00'
        }
    
    # Backup the old registry
    backup_path = registry_path.with_suffix('.json.backup')
    with open(backup_path, 'w') as f:
        json.dump(old_registry, f, indent=2)
    print(f"Backed up old registry to {backup_path}")
    
    # Save the new registry
    with open(registry_path, 'w') as f:
        json.dump(new_registry, f, indent=2)
    
    print(f"Successfully migrated transition registry:")
    print(f"  - {len(new_registry)} transitions converted")
    print(f"  - All transitions assigned to graph: {graph_id}")
    print(f"  - New registry saved to {registry_path}")

if __name__ == "__main__":
    # Migrate the existing transition registry
    user_id = "a82083eb-adad-4f71-9af9-7ece926f1606"
    graph_id = "chemical_elements"  # The graph this transition belongs to
    
    migrate_transition_registry(user_id, graph_id) 