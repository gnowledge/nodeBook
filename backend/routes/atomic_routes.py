"""
Atomic Operations and Data Validation Routes

This module provides API endpoints for:
1. Data consistency validation
2. Backup management
3. Atomic operation status
4. Data integrity checks

These endpoints ensure the NDF Studio backend maintains data integrity
and provides tools for monitoring and maintaining the system.
"""

from fastapi import APIRouter, HTTPException
from pathlib import Path
from typing import Dict, Any
from backend.core.atomic_ops import (
    validate_data_consistency,
    cleanup_old_backups,
    AtomicityError,
    save_json_file_atomic,
    load_json_file,
    graph_transaction,
    atomic_registry_save,
    atomic_node_save,
    atomic_composed_save
)
from backend.core import dal

router = APIRouter()

@router.get("/users/{user_id}/graphs/{graph_id}/validate")
def validate_graph_consistency_endpoint(user_id: str, graph_id: str):
    """
    Validate the consistency of a graph's data.
    
    This endpoint performs comprehensive validation of:
    - Node registry consistency
    - Relation registry consistency  
    - Attribute registry consistency
    - File existence checks
    - Reference integrity
    
    Returns validation results with issues and warnings.
    """
    try:
        validation_result = validate_data_consistency(user_id)
        return validation_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@router.post("/users/{user_id}/cleanup-backups")
def cleanup_old_backups_endpoint(user_id: str, max_age_hours: int = 24):
    """
    Clean up old backup directories for a user.
    
    Args:
        user_id: User ID
        max_age_hours: Maximum age of backups to keep (default: 24 hours)
    
    Returns:
        Number of backups cleaned up
    """
    try:
        cleaned_count = cleanup_old_backups(user_id, max_age_hours)
        return {
            "status": "Backup cleanup completed",
            "cleaned_count": cleaned_count,
            "max_age_hours": max_age_hours
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backup cleanup failed: {str(e)}")

@router.get("/users/{user_id}/backups/status")
def get_backup_status(user_id: str):
    """
    Get the status of backups for a user.
    
    Returns:
        Information about existing backups
    """
    try:
        return dal.get_backup_status(user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get backup status: {str(e)}")

@router.get("/users/{user_id}/graphs/{graph_id}/atomic-status")
def get_atomic_operation_status(user_id: str, graph_id: str):
    """
    Get the status of atomic operations for a graph.
    
    Returns:
        Information about the graph's atomic operation status
    """
    try:
        return dal.get_atomic_operation_status(user_id, graph_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get atomic operation status: {str(e)}")

@router.post("/users/{user_id}/graphs/{graph_id}/force-regenerate")
def force_regenerate_composed_files(user_id: str, graph_id: str):
    """
    Force regeneration of all composed files for a graph.
    
    This endpoint triggers a complete regeneration of:
    - composed.json
    - composed.yaml  
    - polymorphic_composed.json
    
    Returns:
        Status of the regeneration operation
    """
    try:
        dal.force_regenerate_composed_files(user_id, graph_id)
        return {
            "status": "Composed files regenerated successfully",
            "files_generated": ["composed.json", "composed.yaml", "polymorphic_composed.json"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate composed files: {str(e)}") 