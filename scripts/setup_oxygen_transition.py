#!/usr/bin/env python3
"""
Script to set up the oxygen ionization transition example.
Creates nodes for oxygen, ionized oxygen, and isotopic oxygen,
then creates a transition for ionization.
"""

import json
import os
from pathlib import Path

def setup_oxygen_transition():
    # Base paths
    base_dir = Path("graph_data/users/undefined")
    nodes_dir = base_dir / "nodes"
    transitions_dir = base_dir / "transitions"
    graphs_dir = base_dir / "graphs"
    
    # Create directories
    nodes_dir.mkdir(parents=True, exist_ok=True)
    transitions_dir.mkdir(parents=True, exist_ok=True)
    graphs_dir.mkdir(parents=True, exist_ok=True)
    
    # Create oxygen nodes
    oxygen_nodes = [
        {
            "id": "oxygen",
            "name": "oxygen",
            "base_name": "oxygen",
            "role": "individual",
            "description": "A chemical element with atomic number 8, essential for respiration and combustion.",
            "morphs": [
                {
                    "morph_id": "neutral",
                    "node_id": "oxygen",
                    "name": "Neutral State",
                    "relationNode_ids": [],
                    "attributeNode_ids": []
                }
            ],
            "nbh": "neutral"
        },
        {
            "id": "ionized_oxygen",
            "name": "ionized oxygen",
            "base_name": "oxygen",
            "adjective": "ionized",
            "role": "individual",
            "description": "Oxygen atom that has lost one or more electrons, becoming positively charged.",
            "morphs": [
                {
                    "morph_id": "charged",
                    "node_id": "ionized_oxygen",
                    "name": "Charged State",
                    "relationNode_ids": [],
                    "attributeNode_ids": []
                }
            ],
            "nbh": "charged"
        },
        {
            "id": "isotopic_oxygen",
            "name": "isotopic oxygen",
            "base_name": "oxygen",
            "adjective": "isotopic",
            "role": "individual",
            "description": "Oxygen atom with different number of neutrons, such as O-18.",
            "morphs": [
                {
                    "morph_id": "heavy",
                    "node_id": "isotopic_oxygen",
                    "name": "Heavy Isotope",
                    "relationNode_ids": [],
                    "attributeNode_ids": []
                }
            ],
            "nbh": "heavy"
        }
    ]
    
    # Save oxygen nodes
    for node in oxygen_nodes:
        node_file = nodes_dir / f"{node['id']}.json"
        with open(node_file, 'w') as f:
            json.dump(node, f, indent=2)
        print(f"Created node: {node['name']}")
    
    # Create transition for oxygen ionization
    ionization_transition = {
        "id": "oxygen_ionization",
        "name": "ionization",
        "adjective": "rapid",
        "tense": "present",
        "inputs": [
            {"id": "oxygen", "nbh": "neutral"}
        ],
        "outputs": [
            {"id": "ionized_oxygen", "nbh": "charged"}
        ],
        "description": "The process of removing electrons from oxygen atoms, typically through exposure to high energy radiation or electric fields."
    }
    
    # Save transition
    transition_file = transitions_dir / f"{ionization_transition['id']}.json"
    with open(transition_file, 'w') as f:
        json.dump(ionization_transition, f, indent=2)
    print(f"Created transition: {ionization_transition['name']}")
    
    # Create transition registry
    transition_registry = [ionization_transition]
    registry_file = base_dir / "transition_registry.json"
    with open(registry_file, 'w') as f:
        json.dump(transition_registry, f, indent=2)
    print("Created transition registry")
    
    # Create node registry
    node_registry = {}
    for node in oxygen_nodes:
        node_registry[node['id']] = {
            "id": node['id'],
            "name": node['name'],
            "graphs": ["oxygen_example"]
        }
    
    registry_file = base_dir / "node_registry.json"
    with open(registry_file, 'w') as f:
        json.dump(node_registry, f, indent=2)
    print("Created node registry")
    
    # Create example graph
    graph_dir = graphs_dir / "oxygen_example"
    graph_dir.mkdir(exist_ok=True)
    
    # Create graph metadata
    metadata = {
        "title": "Oxygen Transition Example",
        "description": "Example graph demonstrating oxygen ionization transition",
        "created": "2024-01-01T00:00:00Z",
        "modified": "2024-01-01T00:00:00Z"
    }
    
    metadata_file = graph_dir / "metadata.yaml"
    with open(metadata_file, 'w') as f:
        import yaml
        yaml.dump(metadata, f, default_flow_style=False)
    
    print("Created oxygen example graph")
    print("\nSetup complete! You can now:")
    print("1. Start the backend server")
    print("2. Navigate to the oxygen example graph")
    print("3. View the oxygen ionization transition")

if __name__ == "__main__":
    setup_oxygen_transition() 