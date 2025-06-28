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
        backup_dir = Path(f"graph_data/users/{user_id}/backups")
        if not backup_dir.exists():
            return {
                "backup_count": 0,
                "backups": [],
                "total_size_mb": 0
            }
        
        backups = []
        total_size = 0
        
        for backup in backup_dir.iterdir():
            if backup.is_dir():
                # Calculate backup size
                backup_size = sum(f.stat().st_size for f in backup.rglob('*') if f.is_file())
                total_size += backup_size
                
                # Extract timestamp and operation from directory name
                try:
                    timestamp_str = backup.name.split('_')[0]
                    operation = '_'.join(backup.name.split('_')[1:])
                    backups.append({
                        "name": backup.name,
                        "timestamp": int(timestamp_str),
                        "operation": operation,
                        "size_mb": round(backup_size / (1024 * 1024), 2)
                    })
                except (ValueError, IndexError):
                    backups.append({
                        "name": backup.name,
                        "timestamp": None,
                        "operation": "unknown",
                        "size_mb": round(backup_size / (1024 * 1024), 2)
                    })
        
        # Sort by timestamp (newest first)
        backups.sort(key=lambda x: x["timestamp"] or 0, reverse=True)
        
        return {
            "backup_count": len(backups),
            "backups": backups,
            "total_size_mb": round(total_size / (1024 * 1024), 2)
        }
        
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
        # Check if graph directory exists
        graph_dir = Path(f"graph_data/users/{user_id}/graphs/{graph_id}")
        if not graph_dir.exists():
            return {
                "graph_exists": False,
                "composed_files": [],
                "last_modified": None
            }
        
        # Check composed files
        composed_files = []
        for composed_file in ["composed.json", "composed.yaml", "polymorphic_composed.json"]:
            file_path = graph_dir / composed_file
            if file_path.exists():
                stat = file_path.stat()
                composed_files.append({
                    "name": composed_file,
                    "exists": True,
                    "size_bytes": stat.st_size,
                    "last_modified": stat.st_mtime
                })
            else:
                composed_files.append({
                    "name": composed_file,
                    "exists": False,
                    "size_bytes": 0,
                    "last_modified": None
                })
        
        # Get graph directory last modified time
        graph_stat = graph_dir.stat()
        
        return {
            "graph_exists": True,
            "composed_files": composed_files,
            "last_modified": graph_stat.st_mtime,
            "directory_size_mb": round(sum(f.stat().st_size for f in graph_dir.rglob('*') if f.is_file()) / (1024 * 1024), 2)
        }
        
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
        from backend.core.registry import load_node_registry
        from backend.core.compose import compose_graph
        from backend.core.atomic_ops import atomic_composed_save
        
        # Get all nodes for this graph
        node_registry = load_node_registry(user_id)
        node_ids = [nid for nid, entry in node_registry.items() if graph_id in (entry.get('graphs') or [])]
        
        # Get graph description
        metadata_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/metadata.yaml")
        graph_description = ""
        if metadata_path.exists():
            import yaml
            with open(metadata_path, "r") as f:
                metadata = yaml.safe_load(f) or {}
                graph_description = metadata.get("description", "")
        
        # Regenerate composed files
        composed_data = compose_graph(user_id, graph_id, node_ids, graph_description)
        if composed_data:
            atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "json")
            atomic_composed_save(user_id, graph_id, composed_data["cytoscape"], "yaml")
            atomic_composed_save(user_id, graph_id, composed_data["polymorphic"], "polymorphic")
        
        return {
            "status": "Composed files regenerated successfully",
            "node_count": len(node_ids),
            "files_generated": ["composed.json", "composed.yaml", "polymorphic_composed.json"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to regenerate composed files: {str(e)}") 