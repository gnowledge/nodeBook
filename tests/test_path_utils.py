"""
Test cases for NDF Studio Path Utilities

This module contains comprehensive test cases for the path utility functions
in backend.core.path_utils module, aiming for high test coverage.
"""

import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from backend.core.path_utils import get_graph_path


class TestGetGraphPath:
    """Test cases for get_graph_path function."""
    
    def test_basic_graph_path(self):
        """Test basic graph path construction."""
        user_id = "user123"
        graph_id = "my_graph"
        expected_path = "/data/users/user123/graphs/my_graph/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_uuid_user_id(self):
        """Test graph path with UUID user ID."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        graph_id = "my_graph"
        expected_path = "/data/users/123e4567-e89b-12d3-a456-426614174000/graphs/my_graph/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_special_graph_id(self):
        """Test graph path with special characters in graph ID."""
        user_id = "user123"
        graph_id = "my-graph@123"
        expected_path = "/data/users/user123/graphs/my-graph@123/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_get_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_empty_user_id(self):
        """Test graph path with empty user ID."""
        user_id = ""
        graph_id = "my_graph"
        expected_path = "/data/users//graphs/my_graph/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_empty_graph_id(self):
        """Test graph path with empty graph ID."""
        user_id = "user123"
        graph_id = ""
        expected_path = "/data/users/user123/graphs//graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_numeric_user_id(self):
        """Test graph path with numeric user ID."""
        user_id = "123"
        graph_id = "my_graph"
        expected_path = "/data/users/123/graphs/my_graph/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_numeric_graph_id(self):
        """Test graph path with numeric graph ID."""
        user_id = "user123"
        graph_id = "123"
        expected_path = "/data/users/user123/graphs/123/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_with_unicode_characters(self):
        """Test graph path with unicode characters."""
        user_id = "user世界"
        graph_id = "graph🚀"
        expected_path = "/data/users/user世界/graphs/graph🚀/graph.ndf"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = MagicMock()
            mock_data_root.__truediv__ = MagicMock(return_value=Path(expected_path))
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert result == expected_path
            
    def test_path_structure_verification(self):
        """Test that the path structure is correct."""
        user_id = "user123"
        graph_id = "my_graph"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = Path("/data")
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            
            # Verify the path structure
            expected_components = ["users", user_id, "graphs", graph_id, "graph.ndf"]
            for component in expected_components:
                assert component in result
                
    def test_return_type(self):
        """Test that the function returns a string."""
        user_id = "user123"
        graph_id = "my_graph"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = Path("/data")
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            assert isinstance(result, str)
            
    def test_data_root_integration(self):
        """Test integration with get_data_root function."""
        user_id = "user123"
        graph_id = "my_graph"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = Path("/custom/data/root")
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            
            # Verify get_data_root was called
            mock_get_data_root.assert_called_once()
            
            # Verify the result includes the custom data root
            assert "/custom/data/root" in result


class TestPathUtilsIntegration:
    """Integration test cases for path_utils module."""
    
    def test_full_path_construction(self):
        """Test full path construction workflow."""
        user_id = "user123"
        graph_id = "my_graph"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = Path("/data")
            mock_get_data_root.return_value = mock_data_root
            
            result = get_graph_path(user_id, graph_id)
            
            # Verify the complete path structure
            expected_path = "/data/users/user123/graphs/my_graph/graph.ndf"
            assert result == expected_path
            
    def test_multiple_calls_consistency(self):
        """Test that multiple calls return consistent results."""
        user_id = "user123"
        graph_id = "my_graph"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = Path("/data")
            mock_get_data_root.return_value = mock_data_root
            
            result1 = get_graph_path(user_id, graph_id)
            result2 = get_graph_path(user_id, graph_id)
            
            assert result1 == result2
            assert result1 == "/data/users/user123/graphs/my_graph/graph.ndf"
            
    def test_different_users_same_graph(self):
        """Test that different users get different paths for the same graph."""
        graph_id = "my_graph"
        
        with patch('backend.core.path_utils.get_data_root') as mock_get_data_root:
            mock_data_root = Path("/data")
            mock_get_data_root.return_value = mock_data_root
            
            result1 = get_graph_path("user1", graph_id)
            result2 = get_graph_path("user2", graph_id)
            
            assert result1 != result2
            assert "user1" in result1
            assert "user2" in result2


if __name__ == "__main__":
    pytest.main([__file__]) 