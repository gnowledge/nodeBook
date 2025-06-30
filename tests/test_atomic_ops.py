"""
Unit tests for the atomic_ops module.

This module tests the atomic file operations and transaction support functions
that ensure data integrity across all NDF Studio operations.
"""

import pytest
import json
import tempfile
import shutil
import os
import time
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock
from datetime import datetime, timedelta
from backend.core.atomic_ops import (
    atomic_write,
    save_json_file_atomic,
    load_json_file,
    atomic_registry_save,
    graph_transaction,
    validate_data_consistency,
    cleanup_old_backups,
    atomic_node_save,
    atomic_relation_save,
    atomic_attribute_save,
    atomic_composed_save,
    AtomicityError,
    ConsistencyError
)


class TestAtomicWrite:
    """Test the atomic_write context manager."""
    
    def test_atomic_write_success(self):
        """Test successful atomic file write."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.txt"
            test_content = "Hello, World!"
            
            with atomic_write(file_path) as f:
                f.write(test_content)
            
            assert file_path.exists()
            with open(file_path, 'r') as f:
                assert f.read() == test_content
    
    def test_atomic_write_creates_parent_directories(self):
        """Test that atomic_write creates parent directories."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "subdir" / "nested" / "test.txt"
            test_content = "Nested content"
            
            with atomic_write(file_path) as f:
                f.write(test_content)
            
            assert file_path.exists()
            with open(file_path, 'r') as f:
                assert f.read() == test_content
    
    def test_atomic_write_failure_cleans_up_temp_file(self):
        """Test that atomic_write cleans up temp file on failure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.txt"
            temp_path = file_path.with_suffix(file_path.suffix + '.tmp')
            
            with pytest.raises(AtomicityError):
                with atomic_write(file_path) as f:
                    f.write("Partial content")
                    raise Exception("Simulated failure")
            
            # Temp file should be cleaned up
            assert not temp_path.exists()
            assert not file_path.exists()
    
    def test_atomic_write_with_different_encoding(self):
        """Test atomic_write with different encoding."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.txt"
            test_content = "Hello, 世界!"
            
            with atomic_write(file_path, encoding='utf-8') as f:
                f.write(test_content)
            
            with open(file_path, 'r', encoding='utf-8') as f:
                assert f.read() == test_content


class TestSaveJsonFileAtomic:
    """Test the save_json_file_atomic function."""
    
    def test_save_json_file_atomic_success(self):
        """Test successful atomic JSON save."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.json"
            test_data = {"key": "value", "number": 42}
            
            save_json_file_atomic(file_path, test_data)
            
            assert file_path.exists()
            with open(file_path, 'r') as f:
                loaded_data = json.load(f)
                assert loaded_data == test_data
    
    def test_save_json_file_atomic_with_backup(self):
        """Test atomic JSON save with backup creation."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.json"
            backup_dir = Path(temp_dir) / "backups"
            backup_dir.mkdir()
            
            # Create initial file
            initial_data = {"initial": "data"}
            save_json_file_atomic(file_path, initial_data)
            
            # Update with backup
            updated_data = {"updated": "data"}
            save_json_file_atomic(file_path, updated_data, backup_dir)
            
            # Check backup was created
            backup_files = list(backup_dir.glob("*.backup"))
            assert len(backup_files) == 1
            
            # Check backup contains original data
            with open(backup_files[0], 'r') as f:
                backup_data = json.load(f)
                assert backup_data == initial_data
    
    def test_save_json_file_atomic_failure_with_rollback(self):
        """Test atomic JSON save with rollback on failure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.json"
            backup_dir = Path(temp_dir) / "backups"
            backup_dir.mkdir()
            
            # Create initial file
            initial_data = {"initial": "data"}
            save_json_file_atomic(file_path, initial_data)
            
            # Create backup
            save_json_file_atomic(file_path, initial_data, backup_dir)
            
            # Simulate failure during save
            with patch('json.dump', side_effect=Exception("JSON dump failed")):
                with pytest.raises(AtomicityError):
                    save_json_file_atomic(file_path, {"new": "data"}, backup_dir)
            
            # Check original file is preserved
            with open(file_path, 'r') as f:
                preserved_data = json.load(f)
                assert preserved_data == initial_data


class TestLoadJsonFile:
    """Test the load_json_file function."""
    
    def test_load_json_file_success(self):
        """Test successful JSON file loading."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "test.json"
            test_data = {"key": "value", "number": 42}
            
            with open(file_path, 'w') as f:
                json.dump(test_data, f)
            
            loaded_data = load_json_file(file_path)
            assert loaded_data == test_data
    
    def test_load_json_file_missing_file(self):
        """Test loading non-existent JSON file returns empty dict."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "nonexistent.json"
            
            loaded_data = load_json_file(file_path)
            assert loaded_data == {}
    
    def test_load_json_file_invalid_json(self):
        """Test loading invalid JSON file raises AtomicityError."""
        with tempfile.TemporaryDirectory() as temp_dir:
            file_path = Path(temp_dir) / "invalid.json"
            
            with open(file_path, 'w') as f:
                f.write("invalid json content")
            
            with pytest.raises(AtomicityError):
                load_json_file(file_path)


class TestAtomicRegistrySave:
    """Test the atomic_registry_save function."""
    
    def test_atomic_registry_save_success(self):
        """Test successful atomic registry save."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            registry_type = "node"
            registry_data = {"node1": {"name": "Node 1"}, "node2": {"name": "Node 2"}}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / f"{registry_type}_registry.json"
                
                atomic_registry_save(user_id, registry_type, registry_data)
                
                # Check file was created
                registry_file = Path(temp_dir) / f"{registry_type}_registry.json"
                assert registry_file.exists()
                
                with open(registry_file, 'r') as f:
                    loaded_data = json.load(f)
                    assert loaded_data == registry_data
    
    def test_atomic_registry_save_creates_user_directory(self):
        """Test that atomic_registry_save creates user directory."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            registry_type = "relation"
            registry_data = {"rel1": {"name": "Relation 1"}}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / "users" / user_id / f"{registry_type}_registry.json"
                
                atomic_registry_save(user_id, registry_type, registry_data)
                
                # Check user directory was created
                user_dir = Path(temp_dir) / "users" / user_id
                assert user_dir.exists()


class TestGraphTransaction:
    """Test the graph_transaction context manager."""
    
    def test_graph_transaction_success(self):
        """Test successful graph transaction."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            graph_id = "test_graph"
            operation_name = "test_operation"
            
            # Create user directory structure
            user_dir = Path(temp_dir) / "users" / user_id
            user_dir.mkdir(parents=True)
            
            # Create some registry files
            registry_files = ["node_registry.json", "relation_registry.json", "attribute_registry.json"]
            for registry_file in registry_files:
                registry_path = user_dir / registry_file
                with open(registry_path, 'w') as f:
                    json.dump({"test": "data"}, f)
            
            # Mock the Path constructor to return our temp directory paths
            def mock_path_constructor(*args):
                if len(args) == 1 and isinstance(args[0], str):
                    # Handle string paths like "graph_data/users/{user_id}/backups/..."
                    if args[0].startswith("graph_data/users/"):
                        return Path(temp_dir) / args[0]
                return Path(*args)
            
            with patch('backend.core.atomic_ops.Path', side_effect=mock_path_constructor):
                with graph_transaction(user_id, graph_id, operation_name) as backup_dir:
                    # Transaction should yield backup directory
                    assert backup_dir.exists()
                    
                    # Check that backups were created
                    backup_files = list(backup_dir.glob("*.json"))
                    assert len(backup_files) == 3
    
    def test_graph_transaction_rollback_on_failure(self):
        """Test graph transaction rollback on failure."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            graph_id = "test_graph"
            operation_name = "test_operation"
            
            # Create user directory structure
            user_dir = Path(temp_dir) / "users" / user_id
            user_dir.mkdir(parents=True)
            
            # Create registry file
            registry_path = user_dir / "node_registry.json"
            original_data = {"original": "data"}
            with open(registry_path, 'w') as f:
                json.dump(original_data, f)
            
            # Mock the Path constructor to return our temp directory paths
            def mock_path_constructor(*args):
                if len(args) == 1 and isinstance(args[0], str):
                    if args[0].startswith("graph_data/users/"):
                        return Path(temp_dir) / args[0]
                return Path(*args)
            
            with patch('backend.core.atomic_ops.Path', side_effect=mock_path_constructor):
                with pytest.raises(AtomicityError):
                    with graph_transaction(user_id, graph_id, operation_name) as backup_dir:
                        # Modify the original file
                        with open(registry_path, 'w') as f:
                            json.dump({"modified": "data"}, f)
                        
                        # Simulate failure
                        raise Exception("Transaction failed")
                
                # Check that original data was restored
                with open(registry_path, 'r') as f:
                    restored_data = json.load(f)
                    assert restored_data == original_data


class TestValidateDataConsistency:
    """Test the validate_data_consistency function."""
    
    def test_validate_data_consistency_valid_data(self):
        """Test validation with valid data."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            user_dir = Path(temp_dir) / "users" / user_id
            user_dir.mkdir(parents=True)
            
            # Create valid registry files
            registry_files = ["node_registry.json", "relation_registry.json", "attribute_registry.json"]
            for registry_file in registry_files:
                registry_path = user_dir / registry_file
                with open(registry_path, 'w') as f:
                    json.dump({"item1": {"name": "Item 1"}}, f)
            
            # Mock the Path constructor to return our temp directory paths
            def mock_path_constructor(*args):
                if len(args) == 1 and isinstance(args[0], str):
                    if args[0].startswith("graph_data/users/"):
                        return Path(temp_dir) / args[0]
                return Path(*args)
            
            with patch('backend.core.atomic_ops.Path', side_effect=mock_path_constructor):
                result = validate_data_consistency(user_id)
                
                assert result["status"] == "valid"
                assert result["user_id"] == user_id
                assert "timestamp" in result
                assert len(result["issues"]) == 0
    
    def test_validate_data_consistency_missing_user_directory(self):
        """Test validation with missing user directory."""
        user_id = "nonexistent_user"
        
        result = validate_data_consistency(user_id)
        
        assert result["status"] == "invalid"
        assert "User data directory does not exist" in result["issues"]
    
    def test_validate_data_consistency_missing_registry_files(self):
        """Test validation with missing registry files."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            user_dir = Path(temp_dir) / "users" / user_id
            user_dir.mkdir(parents=True)
            
            # Mock the Path constructor to return our temp directory paths
            def mock_path_constructor(*args):
                if len(args) == 1 and isinstance(args[0], str):
                    if args[0].startswith("graph_data/users/"):
                        return Path(temp_dir) / args[0]
                return Path(*args)
            
            with patch('backend.core.atomic_ops.Path', side_effect=mock_path_constructor):
                result = validate_data_consistency(user_id)
                
                assert result["status"] == "warning"
                assert len(result["issues"]) == 3  # Three missing registry files


class TestCleanupOldBackups:
    """Test the cleanup_old_backups function."""
    
    def test_cleanup_old_backups_no_backups(self):
        """Test cleanup when no backups exist."""
        user_id = "test_user"
        
        cleaned_count = cleanup_old_backups(user_id)
        assert cleaned_count == 0
    
    def test_cleanup_old_backups_with_old_backups(self):
        """Test cleanup of old backups."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            backup_dir = Path(temp_dir) / "users" / user_id / "backups"
            backup_dir.mkdir(parents=True)
            
            # Create old backup directory (2023)
            old_backup = backup_dir / f"graph_20230101_120000_12345678"
            old_backup.mkdir()
            
            # Create recent backup directory (current year)
            recent_backup = backup_dir / f"graph_{datetime.now().strftime('%Y%m%d_%H%M%S')}_87654321"
            recent_backup.mkdir()
            
            # Mock the Path constructor to return our temp directory paths
            def mock_path_constructor(*args):
                if len(args) == 1 and isinstance(args[0], str):
                    if args[0].startswith("graph_data/users/"):
                        return Path(temp_dir) / args[0]
                return Path(*args)
            
            with patch('backend.core.atomic_ops.Path', side_effect=mock_path_constructor):
                cleaned_count = cleanup_old_backups(user_id, max_age_hours=1)
                
                # Only old backup should be cleaned
                assert cleaned_count == 1
                assert not old_backup.exists()
                assert recent_backup.exists()


class TestConvenienceFunctions:
    """Test the convenience functions for atomic saves."""
    
    def test_atomic_node_save(self):
        """Test atomic_node_save function."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            node_id = "test_node"
            node_data = {"id": node_id, "name": "Test Node"}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / "nodes" / f"{node_id}.json"
                
                atomic_node_save(user_id, node_id, node_data)
                
                # Check file was created
                node_file = Path(temp_dir) / "nodes" / f"{node_id}.json"
                assert node_file.exists()
    
    def test_atomic_relation_save(self):
        """Test atomic_relation_save function."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            relation_id = "test_relation"
            relation_data = {"id": relation_id, "name": "Test Relation"}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / "relationNodes" / f"{relation_id}.json"
                
                atomic_relation_save(user_id, relation_id, relation_data)
                
                # Check file was created
                relation_file = Path(temp_dir) / "relationNodes" / f"{relation_id}.json"
                assert relation_file.exists()
    
    def test_atomic_attribute_save(self):
        """Test atomic_attribute_save function."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            attribute_id = "test_attribute"
            attribute_data = {"id": attribute_id, "name": "Test Attribute"}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / "attributeNodes" / f"{attribute_id}.json"
                
                atomic_attribute_save(user_id, attribute_id, attribute_data)
                
                # Check file was created
                attribute_file = Path(temp_dir) / "attributeNodes" / f"{attribute_id}.json"
                assert attribute_file.exists()
    
    def test_atomic_composed_save_json(self):
        """Test atomic_composed_save with JSON format."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            graph_id = "test_graph"
            composed_data = {"nodes": [], "edges": []}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / "graphs" / graph_id / "composed.json"
                
                atomic_composed_save(user_id, graph_id, composed_data, "json")
                
                # Check file was created
                composed_file = Path(temp_dir) / "graphs" / graph_id / "composed.json"
                assert composed_file.exists()
    
    def test_atomic_composed_save_yaml(self):
        """Test atomic_composed_save with YAML format."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            graph_id = "test_graph"
            composed_data = {"nodes": [], "edges": []}
            
            with patch('backend.core.atomic_ops.Path') as mock_path:
                mock_path.return_value = Path(temp_dir) / "graphs" / graph_id / "composed.yaml"
                
                atomic_composed_save(user_id, graph_id, composed_data, "yaml")
                
                # Check file was created
                composed_file = Path(temp_dir) / "graphs" / graph_id / "composed.yaml"
                assert composed_file.exists()


class TestAtomicOperationsIntegration:
    """Test integration scenarios with atomic operations."""
    
    def test_full_atomic_workflow(self):
        """Test complete atomic workflow with transaction."""
        with tempfile.TemporaryDirectory() as temp_dir:
            user_id = "test_user"
            graph_id = "test_graph"
            
            # Create user directory structure
            user_dir = Path(temp_dir) / "users" / user_id
            user_dir.mkdir(parents=True)
            
            # Create initial registry
            registry_data = {"node1": {"name": "Node 1"}}
            registry_path = user_dir / "node_registry.json"
            with open(registry_path, 'w') as f:
                json.dump(registry_data, f)
            
            # Mock the Path constructor to return our temp directory paths
            def mock_path_constructor(*args):
                if len(args) == 1 and isinstance(args[0], str):
                    if args[0].startswith("graph_data/users/"):
                        return Path(temp_dir) / args[0]
                return Path(*args)
            
            with patch('backend.core.atomic_ops.Path', side_effect=mock_path_constructor):
                # Perform atomic operations within transaction
                with graph_transaction(user_id, graph_id, "test_workflow") as backup_dir:
                    # Save node atomically
                    node_data = {"id": "node1", "name": "Updated Node 1"}
                    atomic_node_save(user_id, "node1", node_data)
                    
                    # Update registry atomically
                    updated_registry = {"node1": {"name": "Updated Node 1"}, "node2": {"name": "Node 2"}}
                    atomic_registry_save(user_id, "node", updated_registry)
                
                # Verify operations were successful
                node_file = Path(temp_dir) / "graph_data" / "users" / user_id / "nodes" / "node1.json"
                assert node_file.exists()
                
                # Verify registry was updated
                with open(registry_path, 'r') as f:
                    final_registry = json.load(f)
                    assert len(final_registry) == 2 