# backend/utils/path_utils.py

"""
NDF Studio Path Utilities

This module provides utility functions for handling file paths in the NDF Studio backend.
These utilities ensure consistent path resolution for graph files and user data.

Functions:
    get_graph_path: Get the full path to a graph's NDF file
"""

from pathlib import Path
from typing import Union

try:
    from backend.config import get_data_root
except ImportError:
    from backend.config import get_data_root

def get_graph_path(user_id: str, graph_id: str) -> str:
    """
    Get the full path to a graph's NDF file.
    
    This function constructs the complete file path to a specific graph's
    NDF (Node-neighborhood Description Framework) file based on the user ID
    and graph ID.
    
    Args:
        user_id (str): Unique identifier for the user
        graph_id (str): Unique identifier for the graph
        
    Returns:
        str: Full path to the graph's NDF file
        
    Example:
        >>> get_graph_path("user123", "my_graph")
        '/path/to/data/users/user123/graphs/my_graph/graph.ndf'
        
    Note:
        The function uses the data root configuration to determine the base path
        for all user data. The path structure follows the pattern:
        {data_root}/users/{user_id}/graphs/{graph_id}/graph.ndf
    """
    return str(get_data_root() / "users" / user_id / "graphs" / graph_id / "graph.ndf")
