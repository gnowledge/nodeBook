"""
NDF Studio Schema Utilities

This module provides utility functions for managing schema definitions in YAML format
in the NDF Studio backend. It handles filtering of used schema types from global schemas
based on actual usage in parsed graphs.

Functions:
    filter_used_schema: Filter schema to only include used types from YAML files
"""

import yaml
from pathlib import Path

def filter_used_schema(parsed_yaml_path, relation_schema_path, attribute_schema_path, output_path):
    """
    Filters only the used relation and attribute types from the global schema
    and writes them into used_schema.yaml.
    
    This function analyzes a parsed graph in YAML format to identify which relation
    and attribute types are actually used, then creates a filtered schema containing
    only those types. This is useful for creating lightweight schemas for specific graphs.
    
    Args:
        parsed_yaml_path (str): Path to the parsed graph YAML file
        relation_schema_path (str): Path to the global relation schema YAML file
        attribute_schema_path (str): Path to the global attribute schema YAML file
        output_path (str): Path where the filtered schema will be written
        
    Returns:
        dict: The filtered schema containing only used types
        
    Example:
        >>> filter_used_schema(
        ...     "parsed_graph.yaml",
        ...     "relation_types.yaml", 
        ...     "attribute_types.yaml",
        ...     "used_schema.yaml"
        ... )
        {'relation_types': [...], 'attribute_types': [...]}
        
    Note:
        This function is similar to the JSON version in schema_ops.py but works
        with YAML files instead of JSON files.
    """
    # Load parsed graph
    parsed_data = yaml.safe_load(Path(parsed_yaml_path).read_text())

    # Collect used relation and attribute names
    used_relation_names = set()
    used_attribute_names = set()

    for node in parsed_data.get("nodes", []):
        for rel in node.get("relations", []):
            used_relation_names.add(rel["name"])
        for attr in node.get("attributes", []):
            used_attribute_names.add(attr["name"])

    # Load global schemas
    global_relations = yaml.safe_load(Path(relation_schema_path).read_text())
    global_attributes = yaml.safe_load(Path(attribute_schema_path).read_text())

    # Filter schemas
    used_relations = [r for r in global_relations if r["name"] in used_relation_names]
    used_attributes = [a for a in global_attributes if a["name"] in used_attribute_names]

    # Compose output
    used_schema = {
        "relation_types": used_relations,
        "attribute_types": used_attributes
    }

    # Write to file
    with open(output_path, "w") as f:
        yaml.dump(used_schema, f, sort_keys=False)

    return used_schema
