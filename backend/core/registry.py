"""
NDF Studio Registry Management

This module provides functions for managing node, relation, and attribute registries
in the NDF Studio backend. These registries track metadata about nodes, relations,
and attributes across different graphs for a user.

Functions:
    get_registry_path: Get the path to a user's node registry file
    load_node_registry: Load a user's node registry from file
    save_node_registry: Save a user's node registry to file
    update_node_registry: Update registry with new node information
    create_node_if_missing: Create a node file if it doesn't exist
    relation_registry_path: Get the path to a user's relation registry file
    attribute_registry_path: Get the path to a user's attribute registry file
    load_registry: Load any registry from a given path
    save_registry: Save any registry to a given path
    make_relation_id: Create a unique relation identifier
    make_attribute_id: Create a unique attribute identifier
    make_polynode_id: Create a unique polynode identifier
    make_morph_id: Create a unique morph identifier
"""

import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from backend.core.utils import normalize_id, save_json_file, load_json_file
from backend.core.cnl_parser import parse_node_title

try:
    from backend.config import get_data_root
except ImportError:
    from backend.config import get_data_root

def get_registry_path(user_id: str) -> Path:
    """
    Get the path to a user's node registry file.
    
    This function constructs the file path for a user's node registry,
    which stores metadata about all nodes created by that user.
    
    Args:
        user_id (str): Unique identifier for the user
        
    Returns:
        Path: Path object pointing to the node registry file
        
    Example:
        >>> get_registry_path("user123")
        PosixPath('/path/to/data/users/user123/node_registry.json')
    """
    return get_data_root() / "users" / user_id / "node_registry.json"

def load_node_registry(user_id: str) -> dict:
    """
    Load a user's node registry from file.
    
    This function loads the node registry for a specific user. If the registry
    file doesn't exist, it returns an empty dictionary.
    
    Args:
        user_id (str): Unique identifier for the user
        
    Returns:
        dict: Node registry data, or empty dict if file doesn't exist
        
    Example:
        >>> registry = load_node_registry("user123")
        >>> print(registry)
        {'node1': {'name': 'Node1', 'graphs': ['graph1'], 'created_at': '2024-01-01T00:00:00'}}
    """
    path = get_registry_path(user_id)
    if path.exists():
        return load_json_file(path)
    else:
        return {}

def save_node_registry(user_id: str, registry: dict):
    """
    Save a user's node registry to file.
    
    This function saves the node registry data to the user's registry file.
    The registry contains metadata about all nodes created by the user.
    
    Args:
        user_id (str): Unique identifier for the user
        registry (dict): Node registry data to save
        
    Example:
        >>> registry = {'node1': {'name': 'Node1', 'graphs': ['graph1']}}
        >>> save_node_registry("user123", registry)
    """
    path = get_registry_path(user_id)
    save_json_file(path, registry)

def update_node_registry(registry: dict, node_id: str, graph_id: str):
    """
    Update registry with new node information.
    
    This function updates the node registry with information about a node
    being used in a specific graph. If the node doesn't exist in the registry,
    it creates a new entry. If it exists, it adds the graph to the node's
    graph list and updates the timestamp.
    
    Args:
        registry (dict): The node registry to update
        node_id (str): Unique identifier for the node
        graph_id (str): Unique identifier for the graph
        
    Example:
        >>> registry = {}
        >>> update_node_registry(registry, "oxygen", "chemistry_graph")
        >>> print(registry["oxygen"]["graphs"])
        ['chemistry_graph']
    """
    now = datetime.utcnow().isoformat()
    if node_id not in registry:
        registry[node_id] = {
            "name": node_id.capitalize(),
            "graphs": [graph_id],
            "created_at": now,
            "updated_at": now
        }
    else:
        if graph_id not in registry[node_id]["graphs"]:
            registry[node_id]["graphs"].append(graph_id)
        registry[node_id]["updated_at"] = now


def create_node_if_missing(user_id: str, node_id: str, name: str = None):
    """
    Create a node file if it doesn't exist.
    
    This function creates a node JSON file if it doesn't already exist.
    It uses the parse_node_title function to extract clean fields from the name
    and creates a structured node data object.
    
    Args:
        user_id (str): Unique identifier for the user
        node_id (str): Unique identifier for the node
        name (str, optional): Human-readable name for the node. Defaults to None.
        
    Example:
        >>> create_node_if_missing("user123", "oxygen", "Oxygen atom")
        # Creates file: /path/to/data/users/user123/nodes/oxygen.json
    """
    node_path = get_data_root() / "users" / user_id / "nodes" / f"{node_id}.json"

    if node_path.exists():
        return

    # Ensure parent directory exists
    node_path.parent.mkdir(parents=True, exist_ok=True)

    # Use parse_node_title to extract clean fields
    title_info = parse_node_title(name or node_id)
    node_data = {
        "id": title_info["id"],
        "name": title_info["name"],
        "base": title_info["base"],
        "quantifier": title_info.get("quantifier"),
        "qualifier": title_info.get("qualifier"),
        "description": "",
        "attributes": [],
        "relations": []
    }
    save_json_file(node_path, node_data)

def relation_registry_path(user_id: str) -> Path:
    """
    Get the path to a user's relation registry file.
    
    This function constructs the file path for a user's relation registry,
    which stores metadata about all relations created by that user.
    
    Args:
        user_id (str): Unique identifier for the user
        
    Returns:
        Path: Path object pointing to the relation registry file
        
    Example:
        >>> relation_registry_path("user123")
        PosixPath('/path/to/data/users/user123/relation_registry.json')
    """
    return get_data_root() / "users" / user_id / "relation_registry.json"

def attribute_registry_path(user_id: str) -> Path:
    """
    Get the path to a user's attribute registry file.
    
    This function constructs the file path for a user's attribute registry,
    which stores metadata about all attributes created by that user.
    
    Args:
        user_id (str): Unique identifier for the user
        
    Returns:
        Path: Path object pointing to the attribute registry file
        
    Example:
        >>> attribute_registry_path("user123")
        PosixPath('/path/to/data/users/user123/attribute_registry.json')
    """
    return get_data_root() / "users" / user_id / "attribute_registry.json"

def transition_registry_path(user_id: str) -> Path:
    """
    Get the path to a user's transition registry file.
    
    This function constructs the file path for a user's transition registry,
    which stores metadata about all transitions created by that user.
    
    Args:
        user_id (str): Unique identifier for the user
        
    Returns:
        Path: Path object pointing to the transition registry file
        
    Example:
        >>> transition_registry_path("user123")
        PosixPath('/path/to/data/users/user123/transition_registry.json')
    """
    return get_data_root() / "users" / user_id / "transition_registry.json"

def load_registry(path: Path) -> dict:
    """
    Load any registry from a given path.
    
    This function loads registry data from a specified file path.
    If the file doesn't exist, it returns an empty dictionary.
    
    Args:
        path (Path): Path to the registry file
        
    Returns:
        dict: Registry data, or empty dict if file doesn't exist
        
    Example:
        >>> path = Path("/path/to/registry.json")
        >>> registry = load_registry(path)
    """
    if path.exists():
        return load_json_file(path)
    else:
        return {}

def save_registry(path: Path, registry: dict):
    """
    Save any registry to a given path.
    
    This function saves registry data to a specified file path.
    
    Args:
        path (Path): Path to the registry file
        registry (dict): Registry data to save
        
    Example:
        >>> path = Path("/path/to/registry.json")
        >>> registry = {"item1": {"name": "Item1"}}
        >>> save_registry(path, registry)
    """
    save_json_file(path, registry)

def make_relation_id(source: str, type_: str, target: str, adverb: str = "", modality: str = "") -> str:
    """
    Create a unique relation identifier.
    
    This function creates a unique identifier for a relation by combining
    the source node, relation type, target node, and optional adverb and modality.
    Empty components are filtered out and the remaining parts are joined with '::'.
    
    Args:
        source (str): Source node identifier
        type_ (str): Relation type name
        target (str): Target node identifier
        adverb (str, optional): Adverb modifier. Defaults to "".
        modality (str, optional): Modality modifier. Defaults to "".
        
    Returns:
        str: Unique relation identifier
        
    Example:
        >>> make_relation_id("oxygen", "bonds_with", "hydrogen", "strongly", "[possibly]")
        'oxygen::strongly::bonds_with::hydrogen::[possibly]'
        >>> make_relation_id("atom", "contains", "nucleus")
        'atom::contains::nucleus'
    """
    parts = [source, adverb, type_, target, modality]
    return '::'.join([p for p in parts if p])

def make_attribute_id(node_id: str, name: str, value: str = "", unit: str = "", adverb: str = "", modality: str = "") -> str:
    """
    Create a unique attribute identifier.
    
    This function creates a unique identifier for an attribute by combining
    all relevant fields and generating a hash to ensure uniqueness. This allows
    multiple attributes with the same name but different values.
    
    Args:
        node_id (str): Node identifier
        name (str): Attribute name
        value (str, optional): Attribute value. Defaults to "".
        unit (str, optional): Unit of measurement. Defaults to "".
        adverb (str, optional): Adverb modifier. Defaults to "".
        modality (str, optional): Modality modifier. Defaults to "".
        
    Returns:
        str: Unique attribute identifier with hash suffix
        
    Example:
        >>> make_attribute_id("oxygen", "mass", "16", "amu")
        'oxygen::mass::a1b2c3d4e5f6'
        >>> make_attribute_id("atom", "color", "blue", "", "very", "[possibly]")
        'atom::color::g7h8i9j0k1l2'
    """
    # Create a unique identifier by combining all relevant fields
    # This allows multiple attributes with the same name but different values
    fields = [node_id, name, value, unit, adverb, modality]
    # Create a hash of the fields to ensure uniqueness
    hash_input = "::".join([str(f) for f in fields if f])
    hash_value = hashlib.md5(hash_input.encode()).hexdigest()[:12]  # Use first 12 chars of hash
    # Return a human-readable prefix with the hash for uniqueness
    return f"{node_id}::{name}::{hash_value}"

def make_polynode_id(quantifier: str = "", adverb: str = "", morph_name: str = "", base_name: str = "") -> str:
    """
    Create a unique polynode identifier.
    
    This function creates a unique identifier for a polynode by combining
    quantifier, adverb, morph name, and base name. If the morph name is "basic",
    it's excluded from the ID. Empty components are filtered out.
    
    Args:
        quantifier (str, optional): Quantifier (e.g., "some", "all"). Defaults to "".
        adverb (str, optional): Adverb modifier. Defaults to "".
        morph_name (str, optional): Morph name. Defaults to "".
        base_name (str, optional): Base name. Defaults to "".
        
    Returns:
        str: Unique polynode identifier
        
    Example:
        >>> make_polynode_id("some", "very", "ionized", "oxygen")
        'some_very_ionized_oxygen'
        >>> make_polynode_id("", "", "basic", "atom")
        'atom'
    """
    # If morph_name is "basic", don't include it in the ID calculation
    if morph_name == "basic":
        morph_name = ""
    parts = [quantifier, adverb, morph_name, base_name]
    return '_'.join([p for p in parts if p])

def make_morph_id(name: str, node_id: str) -> str:
    """
    Create a unique morph identifier.
    
    This function creates a unique identifier for a morph by combining
    the morph name with the node identifier.
    
    Args:
        name (str): Morph name
        node_id (str): Node identifier
        
    Returns:
        str: Unique morph identifier
        
    Example:
        >>> make_morph_id("ionized", "oxygen")
        'ionized_oxygen'
        >>> make_morph_id("excited", "atom")
        'excited_atom'
    """
    return f"{name}_{node_id}"


