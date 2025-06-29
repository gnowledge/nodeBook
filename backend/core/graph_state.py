"""
NDF Studio Graph State Management

This module manages the global graph state for the NDF Studio backend.
It provides functionality to populate and maintain a directed graph representation
of the knowledge base using NetworkX.

The module maintains a global directed graph that represents the relationships
between nodes in the knowledge base, loaded from YAML files in the global data directory.

Functions:
    populate_graph: Populate the global graph with data from YAML files
"""

import os
import networkx as nx
import json
import yaml
from typing import Dict, Any, Optional
from backend.core.id_utils import normalize_id, get_graph_path

# Global directed graph to store the knowledge base structure
graph = nx.DiGraph()


def load_global_node(node_identifier: str) -> Dict[str, Any]:
    """
    Load node data from global YAML files.
    
    This function loads node data from YAML files in the global data directory.
    It's specifically designed for loading global knowledge base data, not user-specific data.
    
    Args:
        node_identifier (str): The identifier of the node (filename without .yaml extension)
        
    Returns:
        Dict[str, Any]: Node data loaded from the YAML file
        
    Raises:
        FileNotFoundError: If the YAML file doesn't exist
        yaml.YAMLError: If the YAML file is malformed
    """
    file_path = os.path.join("graph_data", "global", f"{node_identifier}.yaml")
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def populate_graph() -> None:
    """
    Populate the global graph with data from YAML files.
    
    This function loads all YAML files from the global data directory and
    constructs a directed graph representation of the knowledge base.
    It skips schema files (relation_types.yaml, attribute_types.yaml, node_types.yaml)
    and processes only node data files.
    
    The function:
    1. Clears the existing graph
    2. Iterates through YAML files in graph_data/global/
    3. Loads node data from each file
    4. Adds nodes to the graph with their labels
    5. Adds edges representing relationships between nodes
    
    Returns:
        None
        
    Example:
        >>> populate_graph()
        >>> print(f"Graph has {len(graph.nodes)} nodes and {len(graph.edges)} edges")
        Graph has 150 nodes and 300 edges
        
    Note:
        This function modifies the global graph object. It should be called
        during application startup to initialize the knowledge base graph.
        
    Raises:
        FileNotFoundError: If the global data directory doesn't exist
        KeyError: If required fields are missing from YAML data
        ValueError: If node or relation data is malformed
    """
    graph.clear()
    
    # Iterate through all YAML files in the global data directory
    for file in os.listdir("graph_data/global/"):
        # Skip non-YAML files
        if not file.endswith(".yaml"):
            continue
            
        # Skip schema files that don't contain node data
        if file in {"relation_types.yaml", "attribute_types.yaml", "node_types.yaml"}:
            continue
            
        # Load node data from the YAML file
        # Remove .yaml extension to get the node identifier
        node_identifier = file[:-5]  # e.g., "china" from "china.yaml"
        try:
            data = load_global_node(node_identifier)
        except (FileNotFoundError, yaml.YAMLError) as e:
            # Skip files that can't be loaded
            continue
        
        # Extract node information
        node = data.get("node", {})
        node_id = node.get("id")
        label = node.get("label", node_id)
        
        # Add node to the graph if it has a valid ID
        if node_id:
            graph.add_node(node_id, label=label)
            
        # Process relationships for this node
        for rel in data.get("relations", []):
            source = rel.get("subject")
            target = rel.get("object")
            label = rel.get("name")
            
            # Add edge to the graph if all required fields are present
            if source and target and label:
                graph.add_edge(source, target, label=label)
