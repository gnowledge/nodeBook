"""
Validation module for ensuring data integrity and proper user/graph existence.
This module enforces that no operations can be performed without valid users and graphs.
"""

import os
import json
import functools
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Callable, Any
from fastapi import HTTPException, Request


def validate_user_exists(user_id: str) -> bool:
    """
    Validate that a user actually exists in the system.
    
    Args:
        user_id: The user ID to validate
        
    Returns:
        True if user exists, False otherwise
        
    Raises:
        HTTPException: If user_id is invalid or user doesn't exist
    """
    if not user_id or not isinstance(user_id, str) or user_id.strip() == "":
        raise HTTPException(status_code=400, detail="Invalid user_id: must be a non-empty string")
    
    # Check if user directory exists
    user_dir = Path(f"graph_data/users/{user_id}")
    if not user_dir.exists():
        return False
    
    # Check if user has a user registry file (this indicates a real user)
    user_registry_path = user_dir / "user_registry.json"
    if not user_registry_path.exists():
        return False
    
    # Verify user registry is valid JSON and contains the user
    try:
        with open(user_registry_path, 'r') as f:
            user_registry = json.load(f)
        
        # Check if user_id exists in the registry
        return user_id in user_registry
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


def validate_graph_exists(user_id: str, graph_id: str) -> bool:
    """
    Validate that a graph exists for a given user.
    
    Args:
        user_id: The user ID
        graph_id: The graph ID to validate
        
    Returns:
        True if graph exists, False otherwise
        
    Raises:
        HTTPException: If graph_id is invalid or graph doesn't exist
    """
    if not graph_id or not isinstance(graph_id, str) or graph_id.strip() == "":
        raise HTTPException(status_code=400, detail="Invalid graph_id: must be a non-empty string")
    
    # First validate user exists
    if not validate_user_exists(user_id):
        raise HTTPException(status_code=404, detail=f"User '{user_id}' does not exist")
    
    # Check if graph directory exists
    graph_dir = Path(f"graph_data/users/{user_id}/graphs/{graph_id}")
    if not graph_dir.exists():
        return False
    
    # Check if graph has a metadata file (this indicates a real graph)
    metadata_path = graph_dir / "metadata.yaml"
    if not metadata_path.exists():
        return False
    
    # Verify metadata is valid YAML
    try:
        import yaml
        with open(metadata_path, 'r') as f:
            metadata = yaml.safe_load(f)
        
        # Basic validation that it's a graph metadata file
        return isinstance(metadata, dict) and "name" in metadata
    except (yaml.YAMLError, KeyError, TypeError):
        return False


def get_user_graphs(user_id: str) -> List[Dict]:
    """
    Get all graphs for a user.
    
    Args:
        user_id: The user ID
        
    Returns:
        List of graph dictionaries with id, name, and metadata
        
    Raises:
        HTTPException: If user doesn't exist
    """
    if not validate_user_exists(user_id):
        raise HTTPException(status_code=404, detail=f"User '{user_id}' does not exist")
    
    graphs = []
    user_graphs_dir = Path(f"graph_data/users/{user_id}/graphs")
    
    if not user_graphs_dir.exists():
        return graphs
    
    for graph_dir in user_graphs_dir.iterdir():
        if not graph_dir.is_dir():
            continue
            
        graph_id = graph_dir.name
        metadata_path = graph_dir / "metadata.yaml"
        
        if metadata_path.exists():
            try:
                import yaml
                with open(metadata_path, 'r') as f:
                    metadata = yaml.safe_load(f) or {}
                
                graphs.append({
                    "id": graph_id,
                    "name": metadata.get("name", graph_id),
                    "description": metadata.get("description", ""),
                    "created_at": metadata.get("created_at"),
                    "updated_at": metadata.get("updated_at")
                })
            except yaml.YAMLError:
                # Skip invalid metadata files
                continue
    
    return graphs


def validate_operation_context(user_id: str, graph_id: str, operation: str) -> None:
    """
    Validate the context for any operation (user and graph existence).
    
    Args:
        user_id: The user ID
        graph_id: The graph ID
        operation: Description of the operation being performed
        
    Raises:
        HTTPException: If validation fails
    """
    if not validate_user_exists(user_id):
        raise HTTPException(
            status_code=404, 
            detail=f"Cannot {operation}: User '{user_id}' does not exist"
        )
    
    if not validate_graph_exists(user_id, graph_id):
        raise HTTPException(
            status_code=404, 
            detail=f"Cannot {operation}: Graph '{graph_id}' does not exist for user '{user_id}'"
        )


def ensure_user_directory_structure(user_id: str) -> None:
    """
    Ensure the basic directory structure exists for a user.
    This should only be called by user creation endpoints.
    
    Args:
        user_id: The user ID
        
    Raises:
        HTTPException: If user_id is invalid
    """
    if not user_id or not isinstance(user_id, str) or user_id.strip() == "":
        raise HTTPException(status_code=400, detail="Invalid user_id: must be a non-empty string")
    
    # Create user directory structure
    user_dir = Path(f"graph_data/users/{user_id}")
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (user_dir / "graphs").mkdir(exist_ok=True)
    (user_dir / "nodes").mkdir(exist_ok=True)
    (user_dir / "relationNodes").mkdir(exist_ok=True)
    (user_dir / "attributeNodes").mkdir(exist_ok=True)


def ensure_graph_directory_structure(user_id: str, graph_id: str) -> None:
    """
    Ensure the basic directory structure exists for a graph.
    This should only be called by graph creation endpoints.
    
    Args:
        user_id: The user ID
        graph_id: The graph ID
        
    Raises:
        HTTPException: If user doesn't exist or graph_id is invalid
    """
    if not validate_user_exists(user_id):
        raise HTTPException(status_code=404, detail=f"User '{user_id}' does not exist")
    
    if not graph_id or not isinstance(graph_id, str) or graph_id.strip() == "":
        raise HTTPException(status_code=400, detail="Invalid graph_id: must be a non-empty string")
    
    # Create graph directory
    graph_dir = Path(f"graph_data/users/{user_id}/graphs/{graph_id}")
    graph_dir.mkdir(parents=True, exist_ok=True)


def validate_node_exists(user_id: str, node_id: str) -> bool:
    """
    Validate that a node exists for a given user.
    
    Args:
        user_id: The user ID
        node_id: The node ID to validate
        
    Returns:
        True if node exists, False otherwise
    """
    if not validate_user_exists(user_id):
        return False
    
    node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
    if not node_path.exists():
        return False
    
    try:
        with open(node_path, 'r') as f:
            node_data = json.load(f)
        return isinstance(node_data, dict) and "id" in node_data
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


def validate_relation_exists(user_id: str, relation_id: str) -> bool:
    """
    Validate that a relation exists for a given user.
    
    Args:
        user_id: The user ID
        relation_id: The relation ID to validate
        
    Returns:
        True if relation exists, False otherwise
    """
    if not validate_user_exists(user_id):
        return False
    
    relation_path = Path(f"graph_data/users/{user_id}/relationNodes/{relation_id}.json")
    if not relation_path.exists():
        return False
    
    try:
        with open(relation_path, 'r') as f:
            relation_data = json.load(f)
        return isinstance(relation_data, dict) and "id" in relation_data
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


def validate_attribute_exists(user_id: str, attribute_id: str) -> bool:
    """
    Validate that an attribute exists for a given user.
    
    Args:
        user_id: The user ID
        attribute_id: The attribute ID to validate
        
    Returns:
        True if attribute exists, False otherwise
    """
    if not validate_user_exists(user_id):
        return False
    
    attribute_path = Path(f"graph_data/users/{user_id}/attributeNodes/{attribute_id}.json")
    if not attribute_path.exists():
        return False
    
    try:
        with open(attribute_path, 'r') as f:
            attribute_data = json.load(f)
        return isinstance(attribute_data, dict) and "id" in attribute_data
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


# ============================================================================
# DECORATOR-BASED VALIDATION
# ============================================================================

def require_user_and_graph(operation: str = "perform operation"):
    """
    Decorator to require valid user and graph existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_user_and_graph("create node")
        def create_node(user_id: str, graph_id: str, ...):
            # Function will only execute if user and graph exist
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id and graph_id from function parameters
            user_id = None
            graph_id = None
            
            # Check positional arguments (FastAPI typically passes them as first args)
            if len(args) >= 2:
                user_id = args[0]
                graph_id = args[1]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if graph_id is None:
                graph_id = kwargs.get('graph_id')
            
            # Validate user and graph existence
            if user_id and graph_id:
                validate_operation_context(user_id, graph_id, operation)
            
            # Execute the original function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_user_exists(operation: str = "perform operation"):
    """
    Decorator to require valid user existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_user_exists("list graphs")
        def list_graphs(user_id: str):
            # Function will only execute if user exists
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id from function parameters
            user_id = None
            
            # Check positional arguments
            if len(args) >= 1:
                user_id = args[0]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            
            # Validate user existence
            if user_id:
                if not validate_user_exists(user_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: User '{user_id}' does not exist"
                    )
            
            # Execute the original function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_node_exists(operation: str = "perform operation"):
    """
    Decorator to require valid node existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_node_exists("update node")
        def update_node(user_id: str, graph_id: str, node_id: str, ...):
            # Function will only execute if user, graph, and node exist
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract parameters from function
            user_id = None
            graph_id = None
            node_id = None
            
            # Check positional arguments
            if len(args) >= 3:
                user_id = args[0]
                graph_id = args[1]
                node_id = args[2]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if graph_id is None:
                graph_id = kwargs.get('graph_id')
            if node_id is None:
                node_id = kwargs.get('node_id')
            
            # Validate user, graph, and node existence
            if user_id and graph_id and node_id:
                validate_operation_context(user_id, graph_id, operation)
                if not validate_node_exists(user_id, node_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Node '{node_id}' does not exist for user '{user_id}'"
                    )
            
            # Execute the original function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_relation_exists(operation: str = "perform operation"):
    """
    Decorator to require valid relation existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_relation_exists("update relation")
        def update_relation(user_id: str, graph_id: str, relation_id: str, ...):
            # Function will only execute if user, graph, and relation exist
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract parameters from function
            user_id = None
            graph_id = None
            relation_id = None
            
            # Check positional arguments
            if len(args) >= 3:
                user_id = args[0]
                graph_id = args[1]
                relation_id = args[2]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if graph_id is None:
                graph_id = kwargs.get('graph_id')
            if relation_id is None:
                relation_id = kwargs.get('relation_id')
            
            # Validate user, graph, and relation existence
            if user_id and graph_id and relation_id:
                validate_operation_context(user_id, graph_id, operation)
                if not validate_relation_exists(user_id, relation_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Relation '{relation_id}' does not exist for user '{user_id}'"
                    )
            
            # Execute the original function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator


def require_attribute_exists(operation: str = "perform operation"):
    """
    Decorator to require valid attribute existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_attribute_exists("update attribute")
        def update_attribute(user_id: str, graph_id: str, attribute_id: str, ...):
            # Function will only execute if user, graph, and attribute exist
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract parameters from function
            user_id = None
            graph_id = None
            attribute_id = None
            
            # Check positional arguments
            if len(args) >= 3:
                user_id = args[0]
                graph_id = args[1]
                attribute_id = args[2]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if graph_id is None:
                graph_id = kwargs.get('graph_id')
            if attribute_id is None:
                attribute_id = kwargs.get('attribute_id')
            
            # Validate user, graph, and attribute existence
            if user_id and graph_id and attribute_id:
                validate_operation_context(user_id, graph_id, operation)
                if not validate_attribute_exists(user_id, attribute_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Attribute '{attribute_id}' does not exist for user '{user_id}'"
                    )
            
            # Execute the original function
            return func(*args, **kwargs)
        
        return wrapper
    return decorator 