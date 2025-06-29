#!/usr/bin/env python3
"""
Test script to verify relation creation and morph operations work correctly.
"""

import requests
import json
import time
import os
from pathlib import Path

# Configuration
BASE_URL = "http://localhost:8000"
USER_ID = "test_user"
GRAPH_ID = "test_graph"

def setup_test_graph():
    """Create the test graph directory and metadata."""
    graph_dir = Path(f"graph_data/users/{USER_ID}/graphs/{GRAPH_ID}")
    graph_dir.mkdir(parents=True, exist_ok=True)
    
    # Create metadata file
    metadata = {
        "id": GRAPH_ID,
        "name": "Test Graph",
        "description": "Test graph for relation and morph operations",
        "created_at": time.time(),
        "updated_at": time.time()
    }
    
    metadata_file = graph_dir / "metadata.yaml"
    import yaml
    with open(metadata_file, 'w') as f:
        yaml.dump(metadata, f, default_flow_style=False)
    
    print(f"Created test graph directory: {graph_dir}")

def test_relation_creation():
    """Test creating a relation with morph_id."""
    print("Testing relation creation with morph_id...")
    
    # Create a test node first
    node_data = {
        "base_name": "test_node",
        "name": "test_node",
        "role": "individual",
        "morphs": [
            {
                "morph_id": "test_node_test_morph",
                "node_id": "test_node",
                "name": "Test Morph",
                "relationNode_ids": [],
                "attributeNode_ids": []
            }
        ],
        "nbh": "test_node_test_morph"
    }
    
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/nodes", json=node_data)
    if response.status_code != 200:
        print(f"Failed to create test node: {response.text}")
        return False
    
    node_id = response.json().get("id", "test_node")
    print(f"Created test node: {node_id}")
    
    # Create a target node
    target_data = {
        "base_name": "target_node",
        "name": "target_node",
        "role": "individual",
        "morphs": []
    }
    
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/nodes", json=target_data)
    if response.status_code != 200:
        print(f"Failed to create target node: {response.text}")
        return False
    
    target_id = response.json().get("id", "target_node")
    print(f"Created target node: {target_id}")
    
    # Create a relation with morph_id
    relation_data = {
        "id": f"{node_id}::is_an::{target_id}",
        "name": "is_an",
        "source_id": node_id,
        "target_id": target_id,
        "morph_id": "test_node_test_morph"
    }
    
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/create", json=relation_data)
    if response.status_code != 200:
        print(f"Failed to create relation: {response.text}")
        return False
    
    print("Successfully created relation with morph_id")
    
    # Verify the relation was added to the correct morph
    response = requests.get(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/list_by_morph/{node_id}")
    if response.status_code != 200:
        print(f"Failed to list relations: {response.text}")
        return False
    
    data = response.json()
    morph_relations = data.get("morphs", {})
    test_morph_relations = morph_relations.get("test_node_test_morph", {})
    relations = test_morph_relations.get("relations", [])
    
    if len(relations) == 1 and relations[0]["name"] == "is_an":
        print("✓ Relation correctly added to test_node_test_morph")
        return True
    else:
        print(f"✗ Relation not found in test_node_test_morph. Found: {relations}")
        return False

def test_morph_operations():
    """Test morph operations (copy, move, unlist)."""
    print("\nTesting morph operations...")
    
    # Create another morph for testing
    node_data = {
        "base_name": "test_node_2",
        "name": "test_node_2",
        "role": "individual",
        "morphs": [
            {
                "morph_id": "test_node_2_morph_1",
                "node_id": "test_node_2",
                "name": "Morph 1",
                "relationNode_ids": [],
                "attributeNode_ids": []
            },
            {
                "morph_id": "test_node_2_morph_2",
                "node_id": "test_node_2",
                "name": "Morph 2",
                "relationNode_ids": [],
                "attributeNode_ids": []
            }
        ],
        "nbh": "test_node_2_morph_1"
    }
    
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/nodes", json=node_data)
    if response.status_code != 200:
        print(f"Failed to create test node 2: {response.text}")
        return False
    
    node_id = response.json().get("id", "test_node_2")
    print(f"Created test node 2: {node_id}")
    
    # Create a target node
    target_data = {
        "base_name": "target_node_2",
        "name": "target_node_2",
        "role": "individual",
        "morphs": []
    }
    
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/nodes", json=target_data)
    if response.status_code != 200:
        print(f"Failed to create target node 2: {response.text}")
        return False
    
    target_id = response.json().get("id", "target_node_2")
    print(f"Created target node 2: {target_id}")
    
    # Create a relation in morph_1
    relation_data = {
        "id": f"{node_id}::is_an::{target_id}",
        "name": "is_an",
        "source_id": node_id,
        "target_id": target_id,
        "morph_id": "test_node_2_morph_1"
    }
    
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/create", json=relation_data)
    if response.status_code != 200:
        print(f"Failed to create relation: {response.text}")
        return False
    
    print("Created relation in morph_1")
    
    # Test copy operation
    copy_data = {"morph_id": "test_node_2_morph_2"}
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/copy_to_morph/{node_id}/is_an", json=copy_data)
    if response.status_code != 200:
        print(f"Failed to copy relation: {response.text}")
        return False
    
    print("✓ Successfully copied relation to morph_2")
    
    # Verify both morphs have the relation
    response = requests.get(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/list_by_morph/{node_id}")
    if response.status_code != 200:
        print(f"Failed to list relations: {response.text}")
        return False
    
    data = response.json()
    morph_relations = data.get("morphs", {})
    morph_1_relations = morph_relations.get("test_node_2_morph_1", {}).get("relations", [])
    morph_2_relations = morph_relations.get("test_node_2_morph_2", {}).get("relations", [])
    
    if len(morph_1_relations) == 1 and len(morph_2_relations) == 1:
        print("✓ Relation exists in both morphs after copy")
    else:
        print(f"✗ Copy failed. morph_1: {len(morph_1_relations)}, morph_2: {len(morph_2_relations)}")
        return False
    
    # Test move operation
    move_data = {"from_morph_id": "test_node_2_morph_1", "to_morph_id": "test_node_2_morph_2"}
    response = requests.post(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/move_to_morph/{node_id}/is_an", json=move_data)
    if response.status_code != 200:
        print(f"Failed to move relation: {response.text}")
        return False
    
    print("✓ Successfully moved relation from morph_1 to morph_2")
    
    # Verify move worked
    response = requests.get(f"{BASE_URL}/api/ndf/users/{USER_ID}/graphs/{GRAPH_ID}/relation/list_by_morph/{node_id}")
    if response.status_code != 200:
        print(f"Failed to list relations: {response.text}")
        return False
    
    data = response.json()
    morph_relations = data.get("morphs", {})
    morph_1_relations = morph_relations.get("test_node_2_morph_1", {}).get("relations", [])
    morph_2_relations = morph_relations.get("test_node_2_morph_2", {}).get("relations", [])
    
    if len(morph_1_relations) == 0 and len(morph_2_relations) == 1:
        print("✓ Move successful - relation only in morph_2")
        return True
    else:
        print(f"✗ Move failed. morph_1: {len(morph_1_relations)}, morph_2: {len(morph_2_relations)}")
        return False

if __name__ == "__main__":
    print("Testing relation creation and morph operations...")
    
    # Setup test graph directory
    setup_test_graph()
    
    # Wait a moment for the backend to be ready
    time.sleep(1)
    
    success1 = test_relation_creation()
    success2 = test_morph_operations()
    
    if success1 and success2:
        print("\n✓ All tests passed!")
    else:
        print("\n✗ Some tests failed!") 