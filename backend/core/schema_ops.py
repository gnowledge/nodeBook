"""
NDF Studio Schema Operations

This module provides functions for managing schema definitions in the NDF Studio backend.
It handles attribute types, relation types, and node types, including loading, saving,
validation, and CNL (Controlled Natural Language) parsing for schema definitions.

Functions:
    ordered_schema_dict: Create an ordered dictionary with specified key order
    ensure_schema_file: Ensure a schema file exists with default data
    load_schema: Load schema data from file with default fallback
    validate_schema_entry: Validate that a schema entry has required keys
    save_schema: Save schema data to file with proper formatting
    load_schema_json: Load JSON schema with default data creation
    create_attribute_type_from_dict: Create attribute type from dictionary data
    create_relation_type_from_dict: Create relation type from dictionary data
    parse_cnl_block: Parse CNL block for schema definitions
    filter_used_schema: Filter schema to only include used types
"""

import os
import json
import re
from collections import OrderedDict
from pathlib import Path

ATTRIBUTE_TYPE_KEYS = ["name", "data_type", "description", "allowed_values", "unit"]
RELATION_TYPE_KEYS = ["name", "inverse_name", "description", "domain", "range"]
NODE_TYPE_KEYS = ["name", "description", "parent_types"]


GLOBAL_SCHEMA_PATH = "graph_data/global"

def ordered_schema_dict(entry: dict, key_order: list[str]) -> OrderedDict:
    """
    Create an ordered dictionary with specified key order.
    
    This function creates an OrderedDict from a regular dictionary, ensuring
    that keys appear in the specified order. Keys not in the order list
    are appended at the end.
    
    Args:
        entry (dict): Input dictionary to reorder
        key_order (list[str]): List of keys in desired order
        
    Returns:
        OrderedDict: Dictionary with keys in specified order
        
    Example:
        >>> entry = {"description": "A type", "name": "MyType", "extra": "value"}
        >>> ordered = ordered_schema_dict(entry, ["name", "description"])
        >>> list(ordered.keys())
        ['name', 'description', 'extra']
    """
    ordered = OrderedDict()
    for key in key_order:
        if key in entry:
            ordered[key] = entry[key]
    for key in entry:
        if key not in ordered:
            ordered[key] = entry[key]
    return ordered


def ensure_schema_file(file_name, default_data):
    """
    Ensure a schema file exists with default data.
    
    This function checks if a schema file exists and creates it with default data
    if it doesn't exist. It also ensures the schema directory exists.
    
    Args:
        file_name (str): Name of the schema file
        default_data: Default data to write if file doesn't exist
        
    Returns:
        str: Path to the schema file
        
    Example:
        >>> ensure_schema_file("attribute_types.json", [])
        'graph_data/global/attribute_types.json'
    """
    file_path = os.path.join(GLOBAL_SCHEMA_PATH, file_name)
    if not os.path.exists(file_path):
        os.makedirs(GLOBAL_SCHEMA_PATH, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
    return file_path

def load_schema(file_name, default_data):
    """
    Load schema data from file with default fallback.
    
    This function loads schema data from a file. If the file doesn't exist,
    it creates it with the default data and returns the default data.
    
    Args:
        file_name (str): Name of the schema file
        default_data: Default data to use if file doesn't exist
        
    Returns:
        list: Schema data from file or default data
        
    Example:
        >>> schema = load_schema("attribute_types.json", [])
        >>> isinstance(schema, list)
        True
    """
    file_path = ensure_schema_file(file_name, default_data)
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)
    return data or default_data

def validate_schema_entry(entry: dict, required_keys: list[str], file_name: str) -> None:
    """
    Validate that a schema entry has required keys.
    
    This function checks if a schema entry contains all required keys.
    If any required keys are missing, it raises a ValueError with details.
    
    Args:
        entry (dict): Schema entry to validate
        required_keys (list[str]): List of required keys
        file_name (str): Name of the schema file for error reporting
        
    Raises:
        ValueError: If required keys are missing
        
    Example:
        >>> entry = {"name": "MyType"}
        >>> validate_schema_entry(entry, ["name", "description"], "test.json")
        Traceback (most recent call last):
        ValueError: Missing keys in test.json entry: ['description'] → {'name': 'MyType'}
    """
    missing = [key for key in required_keys if key not in entry]
    if missing:
        raise ValueError(f"Missing keys in {file_name} entry: {missing} → {entry}")

def save_schema(file_name, data: list[dict]):
    """
    Save schema data to file with proper formatting.
    
    This function saves schema data to a file with proper key ordering
    and validation. It determines the appropriate key order based on
    the file name and validates each entry before saving.
    
    Args:
        file_name (str): Name of the schema file
        data (list[dict]): List of schema entries to save
        
    Example:
        >>> data = [{"name": "MyType", "description": "A type"}]
        >>> save_schema("attribute_types.json", data)
    """
    file_path = os.path.join(GLOBAL_SCHEMA_PATH, file_name)

    # Choose key order based on file
    file_str = str(file_name)
    if "attribute" in file_str:
        key_order = ATTRIBUTE_TYPE_KEYS
    elif "relation" in file_str:
        key_order = RELATION_TYPE_KEYS
    elif "node" in file_str:
        key_order = NODE_TYPE_KEYS
    else:
        key_order = []


    formatted = []
    for entry in sorted(data, key=lambda x: x.get("name", "")):
        validate_schema_entry(entry, key_order, file_name)
        formatted.append(ordered_schema_dict(entry, key_order))

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(formatted, f, indent=2)

def load_schema_json(file_name: str, default_data: list):
    """
    Load JSON schema with default data creation.
    
    This function loads JSON schema data from a file. If the file is empty
    or contains None, it writes the default data and returns it.
    
    Args:
        file_name (str): Name of the schema file
        default_data (list): Default data to use if file is empty
        
    Returns:
        list: Schema data from file or default data
        
    Example:
        >>> schema = load_schema_json("relation_types.json", [])
        >>> isinstance(schema, list)
        True
    """
    file_path = ensure_schema_file(file_name, default_data)
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)
    if data is None:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    return data


def create_attribute_type_from_dict(data: dict):
    """
    Create attribute type from dictionary data.
    
    This function creates a new attribute type from dictionary data and adds it
    to the attribute types schema. If an attribute type with the same name
    already exists, the function returns without making changes.
    
    Args:
        data (dict): Attribute type data with keys: name, data_type, unit, applicable_classes
        
    Example:
        >>> data = {
        ...     "name": "mass",
        ...     "data_type": "float",
        ...     "unit": "kg",
        ...     "applicable_classes": ["atom", "molecule"]
        ... }
        >>> create_attribute_type_from_dict(data)
    """
    attr_types = load_schema("attribute_types.json", default_data=[])
    existing_names = {a["name"] for a in attr_types}
    if data["name"] in existing_names:
        return  # or raise or skip silently

    attr_types.append(OrderedDict([
        ("name", data["name"]),
        ("data_type", data["data_type"]),
        ("unit", data["unit"]),
        ("applicable_classes", data["applicable_classes"]),
    ]))
    save_schema("attribute_types.json", attr_types)


def create_relation_type_from_dict(data: dict):
    """
    Create relation type from dictionary data.
    
    This function creates a new relation type from dictionary data and adds it
    to the relation types schema. If a relation type with the same name
    already exists, the function returns without making changes.
    
    Args:
        data (dict): Relation type data with keys: name, inverse, domain, range
        
    Example:
        >>> data = {
        ...     "name": "bonds_with",
        ...     "inverse": "bonded_by",
        ...     "domain": "atom",
        ...     "range": "atom"
        ... }
        >>> create_relation_type_from_dict(data)
    """
    rel_types = load_schema("relation_types.json", default_data=[])
    existing_names = {r["name"] for r in rel_types}
    if data["name"] in existing_names:
        return

    rel_types.append(OrderedDict([
        ("name", data["name"]),
        ("inverse", data["inverse"]),
        ("domain", data["domain"]),
        ("range", data["range"]),
    ]))
    save_schema("relation_types.json", rel_types)


def parse_cnl_block(block: str) -> list[dict]:
    """
    Parse CNL block for schema definitions.
    
    This function parses a Controlled Natural Language (CNL) block to extract
    schema definitions for attributes and relations. It supports the following
    CNL patterns:
    - "define attribute 'name' as a type with unit 'unit' applicable to classes."
    - "define relation 'name' with inverse 'inverse' between 'domain' and 'range'."
    
    Args:
        block (str): CNL block containing schema definitions
        
    Returns:
        list[dict]: List of parsed schema statements
        
    Example:
        >>> cnl = '''
        ... define attribute 'mass' as a float with unit 'kg' applicable to atom, molecule.
        ... define relation 'bonds_with' with inverse 'bonded_by' between 'atom' and 'atom'.
        ... '''
        >>> statements = parse_cnl_block(cnl)
        >>> len(statements)
        2
    """
    lines = block.strip().splitlines()
    statements = []
    for line in lines:
        line = line.strip()

        # --- Define attribute ---
        if line.lower().startswith("define attribute"):
            m = re.match(
                r"define attribute '(.+?)' as a (\w+)(?: with unit '(.+?)')?(?: applicable to (.+?))?\.", line)
            if m:
                name, data_type, unit, classes = m.groups()
                statements.append({
                    "type": "define_attribute",
                    "name": name,
                    "data_type": data_type,
                    "unit": unit or "",
                    "applicable_classes": [c.strip(" '") for c in classes.split(",")] if classes else []
                })

        # --- Define relation ---
        elif line.lower().startswith("define relation"):
            m = re.match(
                r"define relation '(.+?)' with inverse '(.+?)'(?: between '(.+?)' and '(.+?)')?\.", line)
            if m:
                name, inverse, domain, range_ = m.groups()
                statements.append({
                    "type": "define_relation",
                    "name": name,
                    "inverse": inverse,
                    "domain": domain,
                    "range": range_,
                })

        # [existing parsing continues...]
    return statements
    
def filter_used_schema(parsed_json_path, relation_schema_path, attribute_schema_path, output_path):
    """
    Filters only the used relation and attribute types from the global schema
    and writes them into used_schema.json.
    
    This function analyzes a parsed graph to identify which relation and attribute
    types are actually used, then creates a filtered schema containing only those
    types. This is useful for creating lightweight schemas for specific graphs.
    
    Args:
        parsed_json_path (str): Path to the parsed graph JSON file
        relation_schema_path (str): Path to the global relation schema file
        attribute_schema_path (str): Path to the global attribute schema file
        output_path (str): Path where the filtered schema will be written
        
    Returns:
        dict: The filtered schema containing only used types
        
    Example:
        >>> filter_used_schema(
        ...     "parsed_graph.json",
        ...     "relation_types.json", 
        ...     "attribute_types.json",
        ...     "used_schema.json"
        ... )
        {'relation_types': [...], 'attribute_types': [...]}
    """
    # Load parsed graph
    with open(parsed_json_path, 'r') as f:
        parsed_data = json.load(f)

    # Collect used relation and attribute names
    used_relation_names = set()
    used_attribute_names = set()

    for node in parsed_data.get("nodes", []):
        for rel in node.get("relations", []):
            used_relation_names.add(rel["name"])
        for attr in node.get("attributes", []):
            used_attribute_names.add(attr["name"])

    # Load global schemas
    with open(relation_schema_path, 'r') as f:
        global_relations = json.load(f)
    with open(attribute_schema_path, 'r') as f:
        global_attributes = json.load(f)

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
        json.dump(used_schema, f, indent=2, sort_keys=False)

    return used_schema
