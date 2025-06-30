"""
Unit tests for the atomic_routes module.

This module tests the API endpoints for atomic operations and data validation.
"""

import pytest
import json
import tempfile
from pathlib import Path
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from backend.routes.atomic_routes import router
from backend.core.atomic_ops import AtomicityError

# Create test client
client = TestClient(router)


class TestValidateGraphConsistencyEndpoint:
    """Test the validate_graph_consistency_endpoint."""
    
    def test_validate_graph_consistency_success(self):
        """Test successful graph consistency validation."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with patch('backend.core.atomic_ops.validate_data_consistency') as mock_validate:
            mock_validate.return_value = {
                "user_id": user_id,
                "status": "valid",
                "issues": [],
                "statistics": {"node_registry.json": 5}
            }
            
            response = client.get(f"/users/{user_id}/graphs/{graph_id}/validate")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "valid"
            assert data["user_id"] == user_id
            mock_validate.assert_called_once_with(user_id)
    
    def test_validate_graph_consistency_failure(self):
        """Test graph consistency validation failure."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with patch('backend.core.atomic_ops.validate_data_consistency') as mock_validate:
            mock_validate.side_effect = Exception("Validation failed")
            
            response = client.get(f"/users/{user_id}/graphs/{graph_id}/validate")
            
            assert response.status_code == 500
            data = response.json()
            assert "Validation failed" in data["detail"]


class TestCleanupOldBackupsEndpoint:
    """Test the cleanup_old_backups_endpoint."""
    
    def test_cleanup_old_backups_success(self):
        """Test successful backup cleanup."""
        user_id = "test_user"
        max_age_hours = 24
        
        with patch('backend.core.atomic_ops.cleanup_old_backups') as mock_cleanup:
            mock_cleanup.return_value = 3
            
            response = client.post(f"/users/{user_id}/cleanup-backups?max_age_hours={max_age_hours}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "Backup cleanup completed"
            assert data["cleaned_count"] == 3
            assert data["max_age_hours"] == max_age_hours
            mock_cleanup.assert_called_once_with(user_id, max_age_hours)
    
    def test_cleanup_old_backups_failure(self):
        """Test backup cleanup failure."""
        user_id = "test_user"
        
        with patch('backend.core.atomic_ops.cleanup_old_backups') as mock_cleanup:
            mock_cleanup.side_effect = Exception("Cleanup failed")
            
            response = client.post(f"/users/{user_id}/cleanup-backups")
            
            assert response.status_code == 500
            data = response.json()
            assert "Cleanup failed" in data["detail"]
    
    def test_cleanup_old_backups_default_age(self):
        """Test backup cleanup with default age."""
        user_id = "test_user"
        
        with patch('backend.core.atomic_ops.cleanup_old_backups') as mock_cleanup:
            mock_cleanup.return_value = 0
            
            response = client.post(f"/users/{user_id}/cleanup-backups")
            
            assert response.status_code == 200
            mock_cleanup.assert_called_once_with(user_id, 24)  # Default 24 hours


class TestGetBackupStatus:
    """Test the get_backup_status endpoint."""
    
    def test_get_backup_status_no_backups(self):
        """Test backup status when no backups exist."""
        user_id = "test_user"
        
        with patch('pathlib.Path.exists', return_value=False):
            response = client.get(f"/users/{user_id}/backups/status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["backup_count"] == 0
            assert data["backups"] == []
            assert data["total_size_mb"] == 0
    
    def test_get_backup_status_with_backups(self):
        """Test backup status with existing backups."""
        user_id = "test_user"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            backup_dir = Path(temp_dir) / "backups"
            backup_dir.mkdir()
            
            # Create mock backup directories
            backup1 = backup_dir / "graph_20240101_120000_12345678"
            backup1.mkdir()
            (backup1 / "node_registry.json").write_text('{"test": "data"}')
            
            backup2 = backup_dir / "graph_20240101_130000_87654321"
            backup2.mkdir()
            (backup2 / "relation_registry.json").write_text('{"test": "data"}')
            
            with patch('pathlib.Path') as mock_path:
                mock_path.side_effect = lambda *args: Path(temp_dir) / Path(*args)
                
                response = client.get(f"/users/{user_id}/backups/status")
                
                assert response.status_code == 200
                data = response.json()
                assert data["backup_count"] == 2
                assert len(data["backups"]) == 2
                assert data["total_size_mb"] > 0
    
    def test_get_backup_status_failure(self):
        """Test backup status failure."""
        user_id = "test_user"
        
        with patch('pathlib.Path') as mock_path:
            mock_path.side_effect = Exception("Path error")
            
            response = client.get(f"/users/{user_id}/backups/status")
            
            assert response.status_code == 500
            data = response.json()
            assert "Failed to get backup status" in data["detail"]


class TestGetAtomicOperationStatus:
    """Test the get_atomic_operation_status endpoint."""
    
    def test_get_atomic_operation_status_graph_not_exists(self):
        """Test atomic operation status for non-existent graph."""
        user_id = "test_user"
        graph_id = "nonexistent_graph"
        
        with patch('pathlib.Path.exists', return_value=False):
            response = client.get(f"/users/{user_id}/graphs/{graph_id}/atomic-status")
            
            assert response.status_code == 200
            data = response.json()
            assert data["graph_exists"] == False
            assert data["composed_files"] == []
            assert data["last_modified"] == None
    
    def test_get_atomic_operation_status_graph_exists(self):
        """Test atomic operation status for existing graph."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with tempfile.TemporaryDirectory() as temp_dir:
            graph_dir = Path(temp_dir) / "graphs" / graph_id
            graph_dir.mkdir(parents=True)
            
            # Create some composed files
            (graph_dir / "composed.json").write_text('{"nodes": []}')
            (graph_dir / "composed.yaml").write_text('nodes: []')
            
            with patch('pathlib.Path') as mock_path:
                mock_path.side_effect = lambda *args: Path(temp_dir) / Path(*args)
                
                response = client.get(f"/users/{user_id}/graphs/{graph_id}/atomic-status")
                
                assert response.status_code == 200
                data = response.json()
                assert data["graph_exists"] == True
                assert len(data["composed_files"]) == 3
                
                # Check that existing files are marked as existing
                json_file = next(f for f in data["composed_files"] if f["name"] == "composed.json")
                assert json_file["exists"] == True
                assert json_file["size_bytes"] > 0
                
                # Check that missing files are marked as not existing
                polymorphic_file = next(f for f in data["composed_files"] if f["name"] == "polymorphic_composed.json")
                assert polymorphic_file["exists"] == False
                assert polymorphic_file["size_bytes"] == 0
    
    def test_get_atomic_operation_status_failure(self):
        """Test atomic operation status failure."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with patch('pathlib.Path') as mock_path:
            mock_path.side_effect = Exception("Path error")
            
            response = client.get(f"/users/{user_id}/graphs/{graph_id}/atomic-status")
            
            assert response.status_code == 500
            data = response.json()
            assert "Failed to get atomic operation status" in data["detail"]


class TestForceRegenerateComposedFiles:
    """Test the force_regenerate_composed_files endpoint."""
    
    def test_force_regenerate_composed_files_success(self):
        """Test successful force regeneration of composed files."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with patch('backend.core.registry.load_node_registry') as mock_load_registry:
            with patch('backend.core.compose.compose_graph') as mock_compose:
                with patch('backend.core.atomic_ops.atomic_composed_save') as mock_save:
                    mock_load_registry.return_value = {
                        "node1": {"graphs": [graph_id]},
                        "node2": {"graphs": [graph_id]}
                    }
                    mock_compose.return_value = {
                        "cytoscape": {"nodes": [], "edges": []},
                        "polymorphic": {"nodes": [], "edges": []}
                    }
                    
                    response = client.post(f"/users/{user_id}/graphs/{graph_id}/force-regenerate")
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert data["status"] == "Composed files regenerated successfully"
                    assert data["node_count"] == 2
                    assert len(data["files_generated"]) == 3
                    
                    # Verify atomic_composed_save was called for each format
                    assert mock_save.call_count == 3
    
    def test_force_regenerate_composed_files_no_nodes(self):
        """Test force regeneration with no nodes in graph."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with patch('backend.core.registry.load_node_registry') as mock_load_registry:
            mock_load_registry.return_value = {}
            
            response = client.post(f"/users/{user_id}/graphs/{graph_id}/force-regenerate")
            
            assert response.status_code == 200
            data = response.json()
            assert data["node_count"] == 0
    
    def test_force_regenerate_composed_files_failure(self):
        """Test force regeneration failure."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        with patch('backend.core.registry.load_node_registry') as mock_load_registry:
            mock_load_registry.side_effect = Exception("Registry load failed")
            
            response = client.post(f"/users/{user_id}/graphs/{graph_id}/force-regenerate")
            
            assert response.status_code == 500
            data = response.json()
            assert "Failed to regenerate composed files" in data["detail"]


class TestAtomicRoutesIntegration:
    """Test integration scenarios with atomic routes."""
    
    def test_full_workflow_with_validation_and_cleanup(self):
        """Test complete workflow with validation and cleanup."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        # Test validation
        with patch('backend.core.atomic_ops.validate_data_consistency') as mock_validate:
            mock_validate.return_value = {
                "user_id": user_id,
                "status": "valid",
                "issues": [],
                "statistics": {}
            }
            
            response = client.get(f"/users/{user_id}/graphs/{graph_id}/validate")
            assert response.status_code == 200
        
        # Test cleanup
        with patch('backend.core.atomic_ops.cleanup_old_backups') as mock_cleanup:
            mock_cleanup.return_value = 2
            
            response = client.post(f"/users/{user_id}/cleanup-backups")
            assert response.status_code == 200
            assert response.json()["cleaned_count"] == 2
        
        # Test status
        with patch('pathlib.Path.exists', return_value=False):
            response = client.get(f"/users/{user_id}/backups/status")
            assert response.status_code == 200
            assert response.json()["backup_count"] == 0
    
    def test_error_handling_consistency(self):
        """Test that all endpoints handle errors consistently."""
        user_id = "test_user"
        graph_id = "test_graph"
        
        # Test all endpoints with the same error
        endpoints = [
            f"/users/{user_id}/graphs/{graph_id}/validate",
            f"/users/{user_id}/cleanup-backups",
            f"/users/{user_id}/backups/status",
            f"/users/{user_id}/graphs/{graph_id}/atomic-status",
            f"/users/{user_id}/graphs/{graph_id}/force-regenerate"
        ]
        
        for endpoint in endpoints:
            with patch('pathlib.Path') as mock_path:
                mock_path.side_effect = Exception("Test error")
                
                if endpoint.endswith("/validate"):
                    with patch('backend.core.atomic_ops.validate_data_consistency') as mock_validate:
                        mock_validate.side_effect = Exception("Test error")
                        response = client.get(endpoint)
                elif endpoint.endswith("/cleanup-backups"):
                    with patch('backend.core.atomic_ops.cleanup_old_backups') as mock_cleanup:
                        mock_cleanup.side_effect = Exception("Test error")
                        response = client.post(endpoint)
                elif endpoint.endswith("/force-regenerate"):
                    with patch('backend.core.registry.load_node_registry') as mock_load:
                        mock_load.side_effect = Exception("Test error")
                        response = client.post(endpoint)
                else:
                    response = client.get(endpoint)
                
                assert response.status_code == 500
                data = response.json()
                assert "detail" in data
                assert "Test error" in data["detail"] or "Failed" in data["detail"] 