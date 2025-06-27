"""
Atomic Operations Module for NDF Studio

This module provides atomic file operations and transaction support to ensure
data integrity across all NDF Studio operations. It implements:

1. Atomic file writes using temporary files and atomic renames
2. Transaction contexts for multi-file operations
3. Rollback mechanisms for failed operations
4. Validation and consistency checks
5. Backup and restore functionality

All data modifications in NDF Studio should go through this module to ensure
atomicity and data integrity.
"""

import json
import tempfile
import shutil
import os
import time
from pathlib import Path
from contextlib import contextmanager
from typing import Dict, List, Any, Optional, Callable, Generator
import logging
from datetime import datetime
import uuid

from core.logging_system import get_logger, log_atomic, log_error, log_operation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AtomicityError(Exception):
    """Raised when atomic operations fail."""
    pass

class ConsistencyError(Exception):
    """Raised when data consistency validation fails."""
    pass

@contextmanager
def atomic_write(file_path: Path, mode='w', encoding='utf-8'):
    """
    Atomic file write using temporary file and rename.
    
    Args:
        file_path: Path to the target file
        mode: File open mode (default: 'w')
        encoding: File encoding (default: 'utf-8')
    
    Yields:
        File object for writing
        
    Raises:
        AtomicityError: If the atomic write fails
    """
    temp_path = file_path.with_suffix(file_path.suffix + '.tmp')
    file_handle = None
    
    try:
        # Ensure parent directory exists
        file_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Open temporary file
        file_handle = open(temp_path, mode, encoding=encoding)
        yield file_handle
        
        # Close file handle before atomic rename
        file_handle.close()
        file_handle = None
        
        # Atomic rename (POSIX systems)
        temp_path.replace(file_path)
        logger.debug(f"Atomic write successful: {file_path}")
        
    except Exception as e:
        logger.error(f"Atomic write failed for {file_path}: {e}")
        if file_handle:
            file_handle.close()
        # Clean up temp file on failure
        if temp_path.exists():
            temp_path.unlink()
        raise AtomicityError(f"Atomic write failed for {file_path}: {e}")

def save_json_file_atomic(file_path: Path, data: Dict[str, Any], backup_dir: Optional[Path] = None) -> None:
    """
    Atomically save JSON data to a file with backup and rollback capability.
    
    Args:
        file_path: Path to the target file
        data: JSON data to save
        backup_dir: Directory to store backups (optional)
    """
    logger = get_logger()
    transaction_id = str(uuid.uuid4())
    
    try:
        logger.atomic(f"Starting atomic JSON save", 
                     transaction_id=transaction_id,
                     operation="save_json_file_atomic",
                     file_path=str(file_path))
        
        # Create backup if backup_dir is provided
        backup_path = None
        if backup_dir and file_path.exists():
            backup_path = backup_dir / f"{file_path.name}.backup"
            shutil.copy2(file_path, backup_path)
            logger.atomic(f"Created backup", 
                         transaction_id=transaction_id,
                         backup_path=str(backup_path))
        
        # Write to temporary file first
        temp_file = file_path.with_suffix(file_path.suffix + '.tmp')
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        
        # Atomically move temp file to target
        temp_file.replace(file_path)
        
        logger.atomic(f"Successfully saved JSON file atomically", 
                     transaction_id=transaction_id,
                     file_path=str(file_path),
                     file_size=len(json.dumps(data)))
        
    except Exception as e:
        logger.error(f"Atomic JSON save failed", 
                    error=e,
                    transaction_id=transaction_id,
                    file_path=str(file_path))
        
        # Attempt rollback if backup exists
        if backup_path and backup_path.exists():
            try:
                shutil.copy2(backup_path, file_path)
                logger.atomic(f"Rollback successful", 
                             transaction_id=transaction_id,
                             backup_path=str(backup_path))
            except Exception as rollback_error:
                logger.error(f"Rollback failed", 
                           error=rollback_error,
                           transaction_id=transaction_id)
        
        raise AtomicityError(f"Failed to save {file_path}: {str(e)}")

def load_json_file(file_path: Path) -> Dict[str, Any]:
    """
    Load JSON data from a file with error handling.
    
    Args:
        file_path: Path to the JSON file
        
    Returns:
        Dictionary containing the JSON data
        
    Raises:
        AtomicityError: If file cannot be loaded
    """
    logger = get_logger()
    
    try:
        if not file_path.exists():
            logger.debug(f"JSON file does not exist, returning empty dict", 
                        file_path=str(file_path))
            return {}
        
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        logger.debug(f"Successfully loaded JSON file", 
                    file_path=str(file_path),
                    data_size=len(json.dumps(data)))
        
        return data
        
    except Exception as e:
        logger.error(f"Failed to load JSON file", 
                    error=e,
                    file_path=str(file_path))
        raise AtomicityError(f"Failed to load {file_path}: {str(e)}")

def atomic_registry_save(user_id: str, registry_type: str, registry_data: Dict[str, Any], 
                        backup_dir: Optional[Path] = None) -> None:
    """
    Atomically save registry data with proper error handling.
    
    Args:
        user_id: User identifier
        registry_type: Type of registry (node, relation, attribute)
        registry_data: Registry data to save
        backup_dir: Directory for backups
    """
    logger = get_logger()
    transaction_id = str(uuid.uuid4())
    
    try:
        logger.atomic(f"Starting atomic registry save", 
                     transaction_id=transaction_id,
                     operation="atomic_registry_save",
                     user_id=user_id,
                     registry_type=registry_type)
        
        registry_path = Path(f"graph_data/users/{user_id}/{registry_type}_registry.json")
        registry_path.parent.mkdir(parents=True, exist_ok=True)
        
        save_json_file_atomic(registry_path, registry_data, backup_dir)
        
        logger.atomic(f"Successfully saved registry", 
                     transaction_id=transaction_id,
                     registry_type=registry_type,
                     user_id=user_id,
                     registry_size=len(registry_data))
        
    except Exception as e:
        logger.error(f"Atomic registry save failed", 
                    error=e,
                    transaction_id=transaction_id,
                    user_id=user_id,
                    registry_type=registry_type)
        raise

@contextmanager
def graph_transaction(user_id: str, graph_id: str, operation_name: str) -> Generator[Path, None, None]:
    """
    Context manager for atomic graph operations with backup and rollback.
    
    Args:
        user_id: User identifier
        graph_id: Graph identifier
        operation_name: Name of the operation for logging
        
    Yields:
        Path to backup directory
        
    Raises:
        AtomicityError: If transaction fails
    """
    logger = get_logger()
    transaction_id = str(uuid.uuid4())
    backup_dir = None
    
    try:
        logger.atomic(f"Starting graph transaction", 
                     transaction_id=transaction_id,
                     operation=operation_name,
                     user_id=user_id,
                     graph_id=graph_id)
        
        # Create backup directory
        backup_dir = Path(f"graph_data/users/{user_id}/backups/{graph_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{transaction_id[:8]}")
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # Create backups of critical files
        user_data_dir = Path(f"graph_data/users/{user_id}")
        critical_files = [
            "node_registry.json",
            "relation_registry.json", 
            "attribute_registry.json"
        ]
        
        for filename in critical_files:
            file_path = user_data_dir / filename
            if file_path.exists():
                backup_path = backup_dir / filename
                shutil.copy2(file_path, backup_path)
                logger.atomic(f"Created backup of critical file", 
                             transaction_id=transaction_id,
                             file=filename,
                             backup_path=str(backup_path))
        
        logger.atomic(f"Transaction backup created", 
                     transaction_id=transaction_id,
                     backup_dir=str(backup_dir))
        
        yield backup_dir
        
        logger.atomic(f"Transaction completed successfully", 
                     transaction_id=transaction_id,
                     operation=operation_name)
        
    except Exception as e:
        logger.error(f"Transaction failed", 
                    error=e,
                    transaction_id=transaction_id,
                    operation=operation_name,
                    user_id=user_id,
                    graph_id=graph_id)
        
        # Attempt rollback if backup exists
        if backup_dir and backup_dir.exists():
            try:
                logger.atomic(f"Attempting transaction rollback", 
                             transaction_id=transaction_id,
                             backup_dir=str(backup_dir))
                
                user_data_dir = Path(f"graph_data/users/{user_id}")
                for backup_file in backup_dir.glob("*.json"):
                    target_file = user_data_dir / backup_file.name
                    shutil.copy2(backup_file, target_file)
                
                logger.atomic(f"Transaction rollback completed", 
                             transaction_id=transaction_id)
                
            except Exception as rollback_error:
                logger.error(f"Transaction rollback failed", 
                           error=rollback_error,
                           transaction_id=transaction_id)
        
        raise AtomicityError(f"Transaction failed: {str(e)}")

def validate_data_consistency(user_id: str) -> Dict[str, Any]:
    """
    Validate data consistency across registries and files.
    
    Args:
        user_id: User identifier
        
    Returns:
        Dictionary with validation results
    """
    logger = get_logger()
    validation_results = {
        "user_id": user_id,
        "timestamp": datetime.now().isoformat(),
        "status": "valid",
        "issues": [],
        "statistics": {}
    }
    
    try:
        logger.operation(f"Starting data consistency validation", 
                        operation="validate_data_consistency",
                        user_id=user_id)
        
        user_data_dir = Path(f"graph_data/users/{user_id}")
        
        # Check if user directory exists
        if not user_data_dir.exists():
            validation_results["issues"].append("User data directory does not exist")
            validation_results["status"] = "invalid"
            return validation_results
        
        # Validate registry files
        registries = ["node_registry.json", "relation_registry.json", "attribute_registry.json"]
        for registry_file in registries:
            registry_path = user_data_dir / registry_file
            if registry_path.exists():
                try:
                    registry_data = load_json_file(registry_path)
                    validation_results["statistics"][registry_file] = len(registry_data)
                    
                    # Check for orphaned files
                    registry_type = registry_file.replace("_registry.json", "")
                    data_dir = user_data_dir / f"{registry_type}Nodes" if registry_type != "node" else user_data_dir / "nodes"
                    
                    if data_dir.exists():
                        file_count = len(list(data_dir.glob("*.json")))
                        registry_count = len(registry_data)
                        
                        if file_count != registry_count:
                            validation_results["issues"].append(
                                f"Mismatch in {registry_type}: {file_count} files vs {registry_count} registry entries"
                            )
                            validation_results["status"] = "warning"
                    
                except Exception as e:
                    validation_results["issues"].append(f"Failed to load {registry_file}: {str(e)}")
                    validation_results["status"] = "invalid"
            else:
                validation_results["issues"].append(f"Registry file {registry_file} does not exist")
                validation_results["status"] = "warning"
        
        logger.operation(f"Data consistency validation completed", 
                        operation="validate_data_consistency",
                        user_id=user_id,
                        status=validation_results["status"],
                        issue_count=len(validation_results["issues"]))
        
        return validation_results
        
    except Exception as e:
        logger.error(f"Data consistency validation failed", 
                    error=e,
                    user_id=user_id)
        validation_results["status"] = "error"
        validation_results["issues"].append(f"Validation failed: {str(e)}")
        return validation_results

def cleanup_old_backups(user_id: str, max_age_hours: int = 24) -> int:
    """
    Clean up old backup directories.
    
    Args:
        user_id: User identifier
        max_age_hours: Maximum age of backups to keep
        
    Returns:
        Number of backups cleaned up
    """
    logger = get_logger()
    
    try:
        logger.operation(f"Starting backup cleanup", 
                        operation="cleanup_old_backups",
                        user_id=user_id,
                        max_age_hours=max_age_hours)
        
        backup_dir = Path(f"graph_data/users/{user_id}/backups")
        if not backup_dir.exists():
            return 0
        
        cutoff_time = datetime.now().timestamp() - (max_age_hours * 3600)
        cleaned_count = 0
        
        for backup_path in backup_dir.iterdir():
            if backup_path.is_dir():
                try:
                    # Extract timestamp from directory name
                    dir_name = backup_path.name
                    if '_' in dir_name:
                        timestamp_str = dir_name.split('_')[1] + '_' + dir_name.split('_')[2]
                        backup_time = datetime.strptime(timestamp_str, '%Y%m%d_%H%M%S').timestamp()
                        
                        if backup_time < cutoff_time:
                            shutil.rmtree(backup_path)
                            cleaned_count += 1
                            logger.operation(f"Cleaned up old backup", 
                                           operation="cleanup_old_backups",
                                           backup_path=str(backup_path))
                except Exception as e:
                    logger.error(f"Failed to clean up backup", 
                               error=e,
                               backup_path=str(backup_path))
        
        logger.operation(f"Backup cleanup completed", 
                        operation="cleanup_old_backups",
                        user_id=user_id,
                        cleaned_count=cleaned_count)
        
        return cleaned_count
        
    except Exception as e:
        logger.error(f"Backup cleanup failed", 
                    error=e,
                    user_id=user_id)
        return 0

# Convenience functions for common operations
def atomic_node_save(user_id: str, node_id: str, node_data: Dict[str, Any]) -> None:
    """Atomically save a node file."""
    node_path = Path(f"graph_data/users/{user_id}/nodes/{node_id}.json")
    node_path.parent.mkdir(parents=True, exist_ok=True)
    save_json_file_atomic(node_path, node_data)

def atomic_relation_save(user_id: str, relation_id: str, relation_data: Dict[str, Any]) -> None:
    """Atomically save a relation file."""
    relation_path = Path(f"graph_data/users/{user_id}/relationNodes/{relation_id}.json")
    relation_path.parent.mkdir(parents=True, exist_ok=True)
    save_json_file_atomic(relation_path, relation_data)

def atomic_attribute_save(user_id: str, attribute_id: str, attribute_data: Dict[str, Any]) -> None:
    """Atomically save an attribute file."""
    attribute_path = Path(f"graph_data/users/{user_id}/attributeNodes/{attribute_id}.json")
    attribute_path.parent.mkdir(parents=True, exist_ok=True)
    save_json_file_atomic(attribute_path, attribute_data)

def atomic_composed_save(user_id: str, graph_id: str, composed_data: Dict[str, Any], format_type: str = "json") -> None:
    """Atomically save a composed file."""
    if format_type == "json":
        composed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.json")
        composed_path.parent.mkdir(parents=True, exist_ok=True)
        save_json_file_atomic(composed_path, composed_data)
    elif format_type == "yaml":
        import yaml
        composed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.yaml")
        composed_path.parent.mkdir(parents=True, exist_ok=True)
        with atomic_write(composed_path) as f:
            yaml.safe_dump(composed_data, f, sort_keys=False, allow_unicode=True)
    elif format_type == "polymorphic":
        composed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/polymorphic_composed.json")
        composed_path.parent.mkdir(parents=True, exist_ok=True)
        save_json_file_atomic(composed_path, composed_data) 