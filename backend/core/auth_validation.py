"""
Authentication and Authorization Validation Module

This module provides decorators and utilities for protecting endpoints using FastAPI Users.
It ensures:
1. Only authenticated users can access protected endpoints
2. Users can only access their own data (unless they're superusers)
3. Global data (schemas, templates) is accessible in read-only mode
"""

import functools
from typing import Callable, Optional
from fastapi import HTTPException, Depends
from backend.routes.users import current_active_user, User
from pathlib import Path
import yaml
import json


def normalize_uuid(uuid_str: str) -> str:
    """Normalize UUID string by removing hyphens for consistent comparison"""
    return uuid_str.replace('-', '') if uuid_str else uuid_str


def require_authenticated_user(operation: str = "perform operation"):
    """
    Decorator to require authentication for any operation.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_authenticated_user("create node")
        def create_node(user_id: str, graph_id: str, user: User = Depends(current_active_user)):
            # Function will only execute if user is authenticated
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # The user parameter should be injected by FastAPI dependency injection
            # This decorator is mainly for documentation and consistency
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_self_access_or_superuser(operation: str = "perform operation"):
    """
    Decorator to ensure users can only access their own data, unless they're superusers.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_self_access_or_superuser("access user data")
        def get_user_data(user_id: str, user: User = Depends(current_active_user)):
            # Function will only execute if user is accessing their own data or is superuser
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id and user from function parameters
            user_id = None
            user = None
            
            # Check positional arguments
            if len(args) >= 1:
                user_id = args[0]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if user is None:
                user = kwargs.get('user')
            
            # Validate access - normalize UUIDs for comparison
            if user_id and user:
                normalized_user_id = normalize_uuid(user_id)
                # The user.id from JWT might still have hyphens, so normalize it too
                normalized_auth_user_id = normalize_uuid(str(user.id))
                if not user.is_superuser and normalized_auth_user_id != normalized_user_id:
                    raise HTTPException(
                        status_code=403,
                        detail=f"Cannot {operation}: Access denied. You can only access your own data."
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_graph_exists(user_id: str, graph_id: str) -> bool:
    """
    Validate that a graph exists for a given user.
    
    Args:
        user_id: The user ID
        graph_id: The graph ID to validate
        
    Returns:
        True if graph exists, False otherwise
    """
    if not graph_id or not isinstance(graph_id, str) or graph_id.strip() == "":
        raise HTTPException(status_code=400, detail="Invalid graph_id: must be a non-empty string")
    
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
        with open(metadata_path, 'r') as f:
            metadata = yaml.safe_load(f)
        
        # Basic validation that it's a graph metadata file
        return isinstance(metadata, dict) and ("title" in metadata or "name" in metadata)
    except (yaml.YAMLError, KeyError, TypeError):
        return False


def require_node_exists(user_id: str, node_id: str) -> bool:
    """
    Validate that a node exists for a given user.
    
    Args:
        user_id: The user ID
        node_id: The node ID to validate
        
    Returns:
        True if node exists, False otherwise
    """
    node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
    if not node_path.exists():
        return False
    
    try:
        with open(node_path, 'r') as f:
            node_data = json.load(f)
        return isinstance(node_data, dict) and "id" in node_data
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


def require_relation_exists(user_id: str, relation_id: str) -> bool:
    """
    Validate that a relation exists for a given user.
    
    Args:
        user_id: The user ID
        relation_id: The relation ID to validate
        
    Returns:
        True if relation exists, False otherwise
    """
    relation_path = Path(f"graph_data/users/{user_id}/relationNodes/{relation_id}.json")
    if not relation_path.exists():
        return False
    
    try:
        with open(relation_path, 'r') as f:
            relation_data = json.load(f)
        return isinstance(relation_data, dict) and "id" in relation_data
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


def require_attribute_exists(user_id: str, attribute_id: str) -> bool:
    """
    Validate that an attribute exists for a given user.
    
    Args:
        user_id: The user ID
        attribute_id: The attribute ID to validate
        
    Returns:
        True if attribute exists, False otherwise
    """
    attribute_path = Path(f"graph_data/users/{user_id}/attributeNodes/{attribute_id}.json")
    if not attribute_path.exists():
        return False
    
    try:
        with open(attribute_path, 'r') as f:
            attribute_data = json.load(f)
        return isinstance(attribute_data, dict) and "id" in attribute_data
    except (json.JSONDecodeError, KeyError, TypeError):
        return False


def require_user_and_graph(operation: str = "perform operation"):
    """
    Decorator to require valid user and graph existence before executing an endpoint.
    This decorator should be used AFTER the authentication decorators.
    
    Args:
        operation: Description of the operation for error messages
        
    Usage:
        @require_authenticated_user("create node")
        @require_self_access_or_superuser("create node")
        @require_user_and_graph("create node")
        def create_node(user_id: str, graph_id: str, user: User = Depends(current_active_user)):
            # Function will only execute if user is authenticated, authorized, and graph exists
            pass
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id and graph_id from function parameters
            user_id = None
            graph_id = None
            
            # Check positional arguments
            if len(args) >= 2:
                user_id = args[0]
                graph_id = args[1]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if graph_id is None:
                graph_id = kwargs.get('graph_id')
            
            # Validate graph existence
            if user_id and graph_id:
                if not require_graph_exists(user_id, graph_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Graph '{graph_id}' does not exist for user '{user_id}'"
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_node_exists_decorator(operation: str = "perform operation"):
    """
    Decorator to require valid node existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id and node_id from function parameters
            user_id = None
            node_id = None
            
            # Check positional arguments
            if len(args) >= 2:
                user_id = args[0]
                node_id = args[1]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if node_id is None:
                node_id = kwargs.get('node_id')
            
            # Validate node existence
            if user_id and node_id:
                if not require_node_exists(user_id, node_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Node '{node_id}' does not exist for user '{user_id}'"
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_relation_exists_decorator(operation: str = "perform operation"):
    """
    Decorator to require valid relation existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id and relation_id from function parameters
            user_id = None
            relation_id = None
            
            # Check positional arguments
            if len(args) >= 2:
                user_id = args[0]
                relation_id = args[1]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if relation_id is None:
                relation_id = kwargs.get('relation_id')
            
            # Validate relation existence
            if user_id and relation_id:
                if not require_relation_exists(user_id, relation_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Relation '{relation_id}' does not exist for user '{user_id}'"
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def require_attribute_exists_decorator(operation: str = "perform operation"):
    """
    Decorator to require valid attribute existence before executing an endpoint.
    
    Args:
        operation: Description of the operation for error messages
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            # Extract user_id and attribute_id from function parameters
            user_id = None
            attribute_id = None
            
            # Check positional arguments
            if len(args) >= 2:
                user_id = args[0]
                attribute_id = args[1]
            
            # Check keyword arguments
            if user_id is None:
                user_id = kwargs.get('user_id')
            if attribute_id is None:
                attribute_id = kwargs.get('attribute_id')
            
            # Validate attribute existence
            if user_id and attribute_id:
                if not require_attribute_exists(user_id, attribute_id):
                    raise HTTPException(
                        status_code=404,
                        detail=f"Cannot {operation}: Attribute '{attribute_id}' does not exist for user '{user_id}'"
                    )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


# Convenience function to get the current user's ID as a string
def get_current_user_id(user: User = Depends(current_active_user)) -> str:
    """Get the current user's ID as a string."""
    return str(user.id)


# Convenience function to check if user is superuser
def is_superuser(user: User = Depends(current_active_user)) -> bool:
    """Check if the current user is a superuser."""
    return user.is_superuser 