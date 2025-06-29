"""
Test cases for NDF Studio ID Utilities

This module contains comprehensive test cases for the ID utility functions
in backend.core.id_utils module, aiming for high test coverage.
"""

import pytest
import tempfile
import os
from pathlib import Path
from unittest.mock import patch
from backend.core.id_utils import (
    normalize_id,
    normalize_uuid,
    get_user_directory_path,
    get_graph_path,
    get_user_id
)


class TestNormalizeId:
    """Test cases for normalize_id function."""
    
    def test_basic_normalization(self):
        """Test basic string normalization."""
        result = normalize_id("My Node Name")
        assert result == "my_node_name"
        
    def test_with_whitespace(self):
        """Test normalization with extra whitespace."""
        result = normalize_id("  My Node Name  ")
        assert result == "my_node_name"
        
    def test_multiple_spaces(self):
        """Test normalization with multiple spaces."""
        result = normalize_id("My   Node   Name")
        assert result == "my___node___name"
        
    def test_special_characters(self):
        """Test normalization with special characters."""
        result = normalize_id("My-Node@Name!")
        assert result == "my-node@name!"
        
    def test_empty_string(self):
        """Test normalization of empty string."""
        result = normalize_id("")
        assert result == ""
        
    def test_single_word(self):
        """Test normalization of single word."""
        result = normalize_id("Node")
        assert result == "node"
        
    def test_numbers(self):
        """Test normalization with numbers."""
        result = normalize_id("Node 123")
        assert result == "node_123"
        
    def test_unicode_characters(self):
        """Test normalization with unicode characters."""
        result = normalize_id("Nóde 世界")
        assert result == "nóde_世界"
        
    def test_mixed_case(self):
        """Test normalization with mixed case."""
        result = normalize_id("MyNodeName")
        assert result == "mynodename"


class TestNormalizeUuid:
    """Test cases for normalize_uuid function."""
    
    def test_uuid_with_hyphens(self):
        """Test UUID normalization with hyphens."""
        uuid_str = "123e4567-e89b-12d3-a456-426614174000"
        result = normalize_uuid(uuid_str)
        assert result == "123e4567e89b12d3a456426614174000"
        
    def test_uuid_without_hyphens(self):
        """Test UUID normalization without hyphens."""
        uuid_str = "123e4567e89b12d3a456426614174000"
        result = normalize_uuid(uuid_str)
        assert result == "123e4567e89b12d3a456426614174000"
        
    def test_empty_string(self):
        """Test normalization of empty string."""
        result = normalize_uuid("")
        assert result == ""
        
    def test_none_string(self):
        """Test normalization of None string."""
        result = normalize_uuid(None)
        assert result is None
        
    def test_partial_hyphens(self):
        """Test UUID with partial hyphens."""
        uuid_str = "123e4567-e89b12d3-a456426614174000"
        result = normalize_uuid(uuid_str)
        assert result == "123e4567e89b12d3a456426614174000"
        
    def test_single_character(self):
        """Test normalization of single character."""
        result = normalize_uuid("a")
        assert result == "a"
        
    def test_non_uuid_string(self):
        """Test normalization of non-UUID string."""
        result = normalize_uuid("hello-world")
        assert result == "helloworld"


class TestGetUserDirectoryPath:
    """Test cases for get_user_directory_path function."""
    
    def test_user_directory_with_hyphens_exists(self):
        """Test when user directory with hyphens exists."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        expected_path = os.path.join("graph_data", "users", user_id)
        
        with patch('os.path.exists') as mock_exists:
            mock_exists.side_effect = lambda path: path == expected_path
            
            result = get_user_directory_path(user_id)
            assert result == expected_path
            
    def test_user_directory_without_hyphens_exists(self):
        """Test when user directory without hyphens exists."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        normalized_id = "123e4567e89b12d3a456426614174000"
        expected_path = os.path.join("graph_data", "users", normalized_id)
        
        with patch('os.path.exists') as mock_exists:
            mock_exists.side_effect = lambda path: path == expected_path
            
            result = get_user_directory_path(user_id)
            assert result == expected_path
            
    def test_neither_directory_exists(self):
        """Test when neither directory exists."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        expected_path = os.path.join("graph_data", "users", user_id)
        
        with patch('os.path.exists', return_value=False):
            result = get_user_directory_path(user_id)
            assert result == expected_path
            
    def test_simple_user_id(self):
        """Test with simple user ID."""
        user_id = "user123"
        expected_path = os.path.join("graph_data", "users", user_id)
        
        with patch('os.path.exists') as mock_exists:
            mock_exists.side_effect = lambda path: path == expected_path
            
            result = get_user_directory_path(user_id)
            assert result == expected_path
            
    def test_empty_user_id(self):
        """Test with empty user ID."""
        user_id = ""
        expected_path = os.path.join("graph_data", "users", user_id)
        
        with patch('os.path.exists') as mock_exists:
            mock_exists.side_effect = lambda path: path == expected_path
            
            result = get_user_directory_path(user_id)
            assert result == expected_path


class TestGetGraphPath:
    """Test cases for get_graph_path function."""
    
    def test_graph_path_exists(self):
        """Test when graph path exists."""
        user_id = "user123"
        graph_id = "my_graph"
        expected_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id)
        
        with patch('backend.core.id_utils.get_user_directory_path') as mock_get_user_path:
            mock_get_user_path.return_value = os.path.join("graph_data", "users", user_id)
            
            with patch('os.path.exists', return_value=True):
                result = get_graph_path(user_id, graph_id)
                assert result == expected_path
                
    def test_graph_path_not_exists(self):
        """Test when graph path doesn't exist."""
        user_id = "user123"
        graph_id = "nonexistent_graph"
        
        with patch('backend.core.id_utils.get_user_directory_path') as mock_get_user_path:
            mock_get_user_path.return_value = os.path.join("graph_data", "users", user_id)
            
            with patch('os.path.exists', return_value=False):
                with pytest.raises(FileNotFoundError) as exc_info:
                    get_graph_path(user_id, graph_id)
                assert f"Graph '{graph_id}' for user '{user_id}' not found." in str(exc_info.value)
                
    def test_with_uuid_user_id(self):
        """Test with UUID user ID."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        graph_id = "my_graph"
        expected_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id)
        
        with patch('backend.core.id_utils.get_user_directory_path') as mock_get_user_path:
            mock_get_user_path.return_value = os.path.join("graph_data", "users", user_id)
            
            with patch('os.path.exists', return_value=True):
                result = get_graph_path(user_id, graph_id)
                assert result == expected_path
                
    def test_with_special_graph_id(self):
        """Test with special characters in graph ID."""
        user_id = "user123"
        graph_id = "my-graph@123"
        expected_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id)
        
        with patch('backend.core.id_utils.get_user_directory_path') as mock_get_user_path:
            mock_get_user_path.return_value = os.path.join("graph_data", "users", user_id)
            
            with patch('os.path.exists', return_value=True):
                result = get_graph_path(user_id, graph_id)
                assert result == expected_path


class TestGetUserId:
    """Test cases for get_user_id function."""
    
    def test_with_user_id_provided(self):
        """Test when user ID is provided."""
        user_id = "user123"
        result = get_user_id(user_id)
        assert result == "user123"
        
    def test_with_none_user_id(self):
        """Test when user ID is None."""
        result = get_user_id(None)
        assert result == "user0"
        
    def test_without_user_id(self):
        """Test when no user ID is provided."""
        result = get_user_id()
        assert result == "user0"
        
    def test_with_empty_string(self):
        """Test with empty string user ID."""
        result = get_user_id("")
        assert result == "user0"
        
    def test_with_uuid_user_id(self):
        """Test with UUID user ID."""
        user_id = "123e4567-e89b-12d3-a456-426614174000"
        result = get_user_id(user_id)
        assert result == user_id
        
    def test_with_zero_user_id(self):
        """Test with zero user ID."""
        user_id = "0"
        result = get_user_id(user_id)
        assert result == "0"


class TestIntegration:
    """Integration test cases for id_utils functions."""
    
    def test_full_path_resolution(self):
        """Test full path resolution workflow."""
        user_id = "user123"
        graph_id = "my_graph"
        
        # Mock the file system
        with patch('os.path.exists') as mock_exists:
            mock_exists.side_effect = lambda path: "user123" in path
            
            # Test user directory path
            user_path = get_user_directory_path(user_id)
            assert user_path == os.path.join("graph_data", "users", user_id)
            
            # Test graph path
            graph_path = get_graph_path(user_id, graph_id)
            expected_graph_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id)
            assert graph_path == expected_graph_path
            
    def test_uuid_workflow(self):
        """Test UUID normalization workflow."""
        uuid_with_hyphens = "123e4567-e89b-12d3-a456-426614174000"
        uuid_without_hyphens = "123e4567e89b12d3a456426614174000"
        
        # Test normalization
        normalized = normalize_uuid(uuid_with_hyphens)
        assert normalized == uuid_without_hyphens
        
        # Test that normalized UUID is consistent
        normalized_again = normalize_uuid(normalized)
        assert normalized_again == uuid_without_hyphens
        
    def test_id_normalization_workflow(self):
        """Test ID normalization workflow."""
        original_label = "  My Complex Node Name  "
        
        # Test normalization
        normalized = normalize_id(original_label)
        assert normalized == "my_complex_node_name"
        
        # Test that normalized ID is consistent
        normalized_again = normalize_id(normalized)
        assert normalized_again == "my_complex_node_name"


if __name__ == "__main__":
    pytest.main([__file__]) 