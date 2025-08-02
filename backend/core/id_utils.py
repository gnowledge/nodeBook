"""
NDF Studio ID Utilities

This module provides utility functions for handling IDs, UUIDs, and file paths
in the NDF Studio backend. These utilities ensure consistent ID formatting
and proper path resolution for user data.

Functions:
    normalize_id: Normalize human-readable labels to safe node IDs
    normalize_uuid: Normalize UUID strings for consistent comparison
    get_user_directory_path: Get user directory path handling UUID formats
    get_graph_path: Get graph directory path for a user
    get_user_id: Get user ID with fallback to default
"""

import os
from typing import Optional


def normalize_id(label: str) -> str:
    """
    Normalize a human-readable label to a safe, file-friendly node ID.
    
    This function converts a human-readable label into a safe identifier
    that can be used for file names and database keys by:
    - Trimming whitespace
    - Converting to lowercase (to ensure consistent IDs)
    - Replacing spaces with underscores
    
    Args:
        label (str): Human-readable label to normalize
        
    Returns:
        str: Normalized, safe identifier in lowercase
        
    Example:
        >>> normalize_id("My Node Name")
        'my_node_name'
        >>> normalize_id("  Water  ")
        'water'
        >>> normalize_id("  water  ")
        'water'
    """
    return label.strip().lower().replace(" ", "_")


def normalize_uuid(uuid_str: Optional[str]) -> Optional[str]:
    """
    Normalize UUID string by removing hyphens for consistent comparison.
    
    This function removes hyphens from UUID strings to ensure consistent
    comparison and storage formats across the application.
    
    Args:
        uuid_str (Optional[str]): UUID string that may contain hyphens
        
    Returns:
        Optional[str]: UUID string with hyphens removed, or original string if None/empty
        
    Example:
        >>> normalize_uuid("123e4567-e89b-12d3-a456-426614174000")
        '123e4567e89b12d3a456426614174000'
        >>> normalize_uuid("123e4567e89b12d3a456426614174000")
        '123e4567e89b12d3a456426614174000'
    """
    return uuid_str.replace('-', '') if uuid_str else uuid_str


def get_user_directory_path(user_id: str) -> str:
    """
    Get the correct user directory path, handling both UUID formats.
    
    FastAPI Users creates directories with hyphens, but database stores without hyphens.
    This function tries both formats to find the correct directory.
    
    Args:
        user_id (str): User ID that may be in either UUID format
        
    Returns:
        str: Path to the user's directory
        
    Example:
        >>> get_user_directory_path("123e4567-e89b-12d3-a456-426614174000")
        'graph_data/users/123e4567-e89b-12d3-a456-426614174000'
    """
    base_path = os.path.join("graph_data", "users")
    
    # Try the original format first (with hyphens)
    path_with_hyphens = os.path.join(base_path, user_id)
    if os.path.exists(path_with_hyphens):
        return path_with_hyphens
    
    # Try normalized format (without hyphens)
    normalized_user_id = normalize_uuid(user_id)
    path_without_hyphens = os.path.join(base_path, normalized_user_id)
    if os.path.exists(path_without_hyphens):
        return path_without_hyphens
    
    # If neither exists, return the original format (FastAPI Users will create it)
    return path_with_hyphens


def get_graph_path(user_id: str, graph_id: str) -> str:
    """
    Get graph directory path for a specific user and graph.
    
    This function constructs the path to a specific graph's directory
    and verifies that the graph exists.
    
    Args:
        user_id (str): User ID
        graph_id (str): Graph ID
        
    Returns:
        str: Path to the graph directory
        
    Raises:
        FileNotFoundError: If the graph directory doesn't exist
        
    Example:
        >>> get_graph_path("user123", "my_graph")
        'graph_data/users/user123/graphs/my_graph'
    """
    base = get_user_directory_path(user_id)
    graph_path = os.path.join(base, "graphs", graph_id)
    # No trailing slash needed; os.path.join handles paths correctly.
    if not os.path.exists(graph_path):
        raise FileNotFoundError(f"Graph '{graph_id}' for user '{user_id}' not found.")
    return graph_path


def get_user_id(user_id: Optional[str] = None) -> str:
    """
    Get user ID with fallback to default.
    
    This function returns the provided user ID or a default value
    if no user ID is provided.
    
    Args:
        user_id (Optional[str]): User ID to return, or None for default
        
    Returns:
        str: User ID or default value "user0"
        
    Example:
        >>> get_user_id("user123")
        'user123'
        >>> get_user_id()
        'user0'
        >>> get_user_id(None)
        'user0'
    """
    return user_id or "user0"