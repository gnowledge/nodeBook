"""
Unit tests for the registry module.

This module tests the registry management functions including node registry,
relation registry, attribute registry, and ID generation functions.
"""

import pytest
import json
import tempfile
import os
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock
from backend.core.registry import (
    get_registry_path,
    load_node_registry,
    save_node_registry,
    update_node_registry,
    create_node_if_missing,
    relation_registry_path,
    attribute_registry_path,
    load_registry,
    save_registry,
    make_relation_id,
    make_attribute_id,
    make_polynode_id,
    make_morph_id
)


class TestRegistryPaths:
    """Test registry path functions."""
    
    @patch('backend.core.registry.get_data_root')
    def test_get_registry_path(self, mock_get_data_root):
        """Test getting node registry path."""
        mock_get_data_root.return_value = Path("/test/data")
        result = get_registry_path("user123")
        expected = Path("/test/data/users/user123/node_registry.json")
        assert result == expected
        mock_get_data_root.assert_called_once()
    
    @patch('backend.core.registry.get_data_root')
    def test_relation_registry_path(self, mock_get_data_root):
        """Test getting relation registry path."""
        mock_get_data_root.return_value = Path("/test/data")
        result = relation_registry_path("user123")
        expected = Path("/test/data/users/user123/relation_registry.json")
        assert result == expected
    
    @patch('backend.core.registry.get_data_root')
    def test_attribute_registry_path(self, mock_get_data_root):
        """Test getting attribute registry path."""
        mock_get_data_root.return_value = Path("/test/data")
        result = attribute_registry_path("user123")
        expected = Path("/test/data/users/user123/attribute_registry.json")
        assert result == expected


class TestNodeRegistry:
    """Test node registry functions."""
    
    def test_load_node_registry_existing_file(self):
        """Test loading existing node registry."""
        test_data = {"node1": {"name": "Node1", "graphs": ["graph1"]}}
        with patch('backend.core.registry.get_registry_path') as mock_path:
            mock_path.return_value = Path("/test/path")
            with patch('pathlib.Path.exists', return_value=True):
                with patch('backend.core.registry.load_json_file', return_value=test_data):
                    result = load_node_registry("user123")
                    assert result == test_data
    
    def test_load_node_registry_missing_file(self):
        """Test loading missing node registry returns empty dict."""
        with patch('backend.core.registry.get_registry_path') as mock_path:
            mock_path.return_value = Path("/test/path")
            with patch('pathlib.Path.exists', return_value=False):
                result = load_node_registry("user123")
                assert result == {}
    
    def test_save_node_registry(self):
        """Test saving node registry."""
        test_data = {"node1": {"name": "Node1", "graphs": ["graph1"]}}
        with patch('backend.core.registry.get_registry_path') as mock_path:
            mock_path.return_value = Path("/test/path")
            with patch('backend.core.registry.save_json_file') as mock_save:
                save_node_registry("user123", test_data)
                mock_save.assert_called_once_with(Path("/test/path"), test_data)
    
    def test_update_node_registry_new_node(self):
        """Test updating registry with new node."""
        registry = {}
        update_node_registry(registry, "oxygen", "chemistry_graph")
        
        assert "oxygen" in registry
        assert registry["oxygen"]["name"] == "Oxygen"
        assert registry["oxygen"]["graphs"] == ["chemistry_graph"]
        assert "created_at" in registry["oxygen"]
        assert "updated_at" in registry["oxygen"]
    
    def test_update_node_registry_existing_node(self):
        """Test updating registry with existing node."""
        registry = {
            "oxygen": {
                "name": "Oxygen",
                "graphs": ["chemistry_graph"],
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
        
        update_node_registry(registry, "oxygen", "physics_graph")
        
        assert registry["oxygen"]["graphs"] == ["chemistry_graph", "physics_graph"]
        assert registry["oxygen"]["updated_at"] != "2024-01-01T00:00:00"
    
    def test_update_node_registry_existing_graph(self):
        """Test updating registry with existing graph doesn't duplicate."""
        registry = {
            "oxygen": {
                "name": "Oxygen",
                "graphs": ["chemistry_graph"],
                "created_at": "2024-01-01T00:00:00",
                "updated_at": "2024-01-01T00:00:00"
            }
        }
        
        update_node_registry(registry, "oxygen", "chemistry_graph")
        
        assert registry["oxygen"]["graphs"] == ["chemistry_graph"]  # No duplication


class TestCreateNodeIfMissing:
    """Test create_node_if_missing function."""
    
    @patch('backend.core.registry.get_data_root')
    @patch('backend.core.registry.parse_node_title')
    @patch('backend.core.registry.save_json_file')
    def test_create_node_if_missing_new_node(self, mock_save, mock_parse, mock_get_data_root):
        """Test creating a new node file."""
        mock_get_data_root.return_value = Path("/test/data")
        mock_parse.return_value = {
            "id": "oxygen",
            "name": "Oxygen",
            "base": "oxygen",
            "quantifier": "",
            "qualifier": ""
        }
        
        with patch('pathlib.Path.exists', return_value=False):
            with patch('pathlib.Path.mkdir') as mock_mkdir:
                create_node_if_missing("user123", "oxygen", "Oxygen atom")
                
                mock_mkdir.assert_called_once_with(parents=True, exist_ok=True)
                mock_parse.assert_called_once_with("Oxygen atom")
                mock_save.assert_called_once()
    
    @patch('backend.core.registry.get_data_root')
    def test_create_node_if_missing_existing_node(self, mock_get_data_root):
        """Test that existing node files are not overwritten."""
        mock_get_data_root.return_value = Path("/test/data")
        
        with patch('pathlib.Path.exists', return_value=True):
            with patch('backend.core.registry.save_json_file') as mock_save:
                create_node_if_missing("user123", "oxygen", "Oxygen atom")
                mock_save.assert_not_called()
    
    @patch('backend.core.registry.get_data_root')
    @patch('backend.core.registry.parse_node_title')
    def test_create_node_if_missing_no_name(self, mock_parse, mock_get_data_root):
        """Test creating node with no name uses node_id."""
        mock_get_data_root.return_value = Path("/test/data")
        mock_parse.return_value = {
            "id": "oxygen",
            "name": "oxygen",
            "base": "oxygen",
            "quantifier": "",
            "qualifier": ""
        }
        
        with patch('pathlib.Path.exists', return_value=False):
            with patch('pathlib.Path.mkdir'):
                with patch('backend.core.registry.save_json_file'):
                    create_node_if_missing("user123", "oxygen")
                    mock_parse.assert_called_once_with("oxygen")


class TestRegistryOperations:
    """Test generic registry operations."""
    
    def test_load_registry_existing_file(self):
        """Test loading existing registry."""
        test_data = {"item1": {"name": "Item1"}}
        test_path = Path("/test/path")
        
        with patch('pathlib.Path.exists', return_value=True):
            with patch('backend.core.registry.load_json_file', return_value=test_data):
                result = load_registry(test_path)
                assert result == test_data
    
    def test_load_registry_missing_file(self):
        """Test loading missing registry returns empty dict."""
        test_path = Path("/test/path")
        
        with patch('pathlib.Path.exists', return_value=False):
            result = load_registry(test_path)
            assert result == {}
    
    def test_save_registry(self):
        """Test saving registry."""
        test_data = {"item1": {"name": "Item1"}}
        test_path = Path("/test/path")
        
        with patch('backend.core.registry.save_json_file') as mock_save:
            save_registry(test_path, test_data)
            mock_save.assert_called_once_with(test_path, test_data)


class TestIDGeneration:
    """Test ID generation functions."""
    
    @pytest.mark.parametrize("source,type_,target,adverb,modality,expected", [
        ("oxygen", "bonds_with", "hydrogen", "", "", "oxygen::bonds_with::hydrogen"),
        ("atom", "contains", "nucleus", "strongly", "", "atom::strongly::contains::nucleus"),
        ("molecule", "reacts_with", "enzyme", "quickly", "[possibly]", "molecule::quickly::reacts_with::enzyme::[possibly]"),
        ("", "type", "target", "", "", "type::target"),
    ])
    def test_make_relation_id(self, source, type_, target, adverb, modality, expected):
        """Test relation ID generation with various combinations."""
        result = make_relation_id(source, type_, target, adverb, modality)
        assert result == expected
    
    def test_make_attribute_id(self):
        """Test attribute ID generation."""
        result = make_attribute_id("oxygen", "mass", "16", "amu")
        assert result.startswith("oxygen::mass::")
        assert len(result.split("::")[-1]) == 12  # Hash part
        
        # Same inputs should produce same hash
        result2 = make_attribute_id("oxygen", "mass", "16", "amu")
        assert result == result2
        
        # Different inputs should produce different hashes
        result3 = make_attribute_id("oxygen", "mass", "32", "amu")
        assert result != result3
    
    @pytest.mark.parametrize("quantifier,adverb,morph_name,base_name,expected", [
        ("some", "very", "ionized", "oxygen", "some_very_ionized_oxygen"),
        ("", "quickly", "excited", "atom", "quickly_excited_atom"),
        ("", "", "basic", "molecule", "molecule"),  # "basic" is excluded
        ("all", "", "", "element", "all_element"),
        ("", "", "", "base", "base"),
    ])
    def test_make_polynode_id(self, quantifier, adverb, morph_name, base_name, expected):
        """Test polynode ID generation with various combinations."""
        result = make_polynode_id(quantifier, adverb, morph_name, base_name)
        assert result == expected
    
    @pytest.mark.parametrize("name,node_id,expected", [
        ("ionized", "oxygen", "ionized_oxygen"),
        ("excited", "atom", "excited_atom"),
        ("", "base", "_base"),
        ("morph", "", "morph_"),
    ])
    def test_make_morph_id(self, name, node_id, expected):
        """Test morph ID generation."""
        result = make_morph_id(name, node_id)
        assert result == expected


class TestRegistryIntegration:
    """Test integration scenarios with registry functions."""
    
    def test_full_registry_workflow(self):
        """Test complete workflow of creating and updating registry."""
        # Start with empty registry
        registry = {}
        
        # Add first node
        update_node_registry(registry, "oxygen", "chemistry_graph")
        assert "oxygen" in registry
        assert registry["oxygen"]["graphs"] == ["chemistry_graph"]
        
        # Add second node
        update_node_registry(registry, "hydrogen", "chemistry_graph")
        assert "hydrogen" in registry
        assert registry["hydrogen"]["graphs"] == ["chemistry_graph"]
        
        # Add oxygen to another graph
        update_node_registry(registry, "oxygen", "physics_graph")
        assert registry["oxygen"]["graphs"] == ["chemistry_graph", "physics_graph"]
        
        # Verify both nodes exist
        assert len(registry) == 2
        assert "oxygen" in registry
        assert "hydrogen" in registry 