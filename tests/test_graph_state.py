"""
Test cases for NDF Studio Graph State Management

This module contains comprehensive test cases for the graph state management functions
in backend.core.graph_state module, aiming for high test coverage.
"""

import pytest
import tempfile
import os
import yaml
import networkx as nx
from pathlib import Path
from unittest.mock import patch, mock_open, MagicMock
from backend.core.graph_state import populate_graph, load_global_node, graph


class TestLoadGlobalNode:
    """Test cases for load_global_node function."""
    
    def test_load_valid_yaml_file(self):
        """Test loading a valid YAML file."""
        node_data = {
            "node": {
                "id": "test_node",
                "label": "Test Node",
                "description": "A test node"
            },
            "relations": [
                {
                    "subject": "test_node",
                    "object": "other_node",
                    "name": "contains"
                }
            ]
        }
        
        yaml_content = yaml.dump(node_data)
        
        with patch('builtins.open', mock_open(read_data=yaml_content)):
            with patch('os.path.join', return_value="graph_data/global/test_node.yaml"):
                result = load_global_node("test_node")
                
        assert result == node_data
        assert result["node"]["id"] == "test_node"
        assert result["node"]["label"] == "Test Node"
        
    def test_load_file_not_found(self):
        """Test loading a non-existent file."""
        with patch('builtins.open', side_effect=FileNotFoundError("File not found")):
            with patch('os.path.join', return_value="graph_data/global/nonexistent.yaml"):
                with pytest.raises(FileNotFoundError):
                    load_global_node("nonexistent")
                    
    def test_load_invalid_yaml(self):
        """Test loading an invalid YAML file."""
        invalid_yaml = "invalid: yaml: content: ["
        
        with patch('builtins.open', mock_open(read_data=invalid_yaml)):
            with patch('os.path.join', return_value="graph_data/global/invalid.yaml"):
                with pytest.raises(yaml.YAMLError):
                    load_global_node("invalid")
                    
    def test_load_empty_yaml(self):
        """Test loading an empty YAML file."""
        empty_yaml = ""
        
        with patch('builtins.open', mock_open(read_data=empty_yaml)):
            with patch('os.path.join', return_value="graph_data/global/empty.yaml"):
                result = load_global_node("empty")
                
        assert result is None
        
    def test_load_complex_node_data(self):
        """Test loading complex node data with multiple relations."""
        node_data = {
            "node": {
                "id": "complex_node",
                "label": "Complex Node",
                "description": "A complex node with many relations"
            },
            "relations": [
                {
                    "subject": "complex_node",
                    "object": "node1",
                    "name": "contains"
                },
                {
                    "subject": "complex_node",
                    "object": "node2",
                    "name": "is_part_of"
                },
                {
                    "subject": "node3",
                    "object": "complex_node",
                    "name": "depends_on"
                }
            ]
        }
        
        yaml_content = yaml.dump(node_data)
        
        with patch('builtins.open', mock_open(read_data=yaml_content)):
            with patch('os.path.join', return_value="graph_data/global/complex_node.yaml"):
                result = load_global_node("complex_node")
                
        assert result == node_data
        assert len(result["relations"]) == 3
        assert result["relations"][0]["name"] == "contains"
        
    def test_file_path_construction(self):
        """Test that the file path is constructed correctly."""
        with patch('builtins.open', mock_open(read_data="{}")):
            with patch('os.path.join') as mock_join:
                mock_join.return_value = "graph_data/global/test.yaml"
                load_global_node("test")
                mock_join.assert_called_once_with("graph_data", "global", "test.yaml")


class TestPopulateGraph:
    """Test cases for populate_graph function."""
    
    def test_populate_graph_basic(self):
        """Test basic graph population."""
        # Mock file listing
        mock_files = ["node1.yaml", "node2.yaml", "relation_types.yaml"]
        
        # Mock node data
        node1_data = {
            "node": {"id": "node1", "label": "Node 1"},
            "relations": [{"subject": "node1", "object": "node2", "name": "contains"}]
        }
        node2_data = {
            "node": {"id": "node2", "label": "Node 2"},
            "relations": []
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node') as mock_load:
                mock_load.side_effect = [node1_data, node2_data]
                
                # Clear the graph first
                graph.clear()
                populate_graph()
                
                # Verify nodes were added
                assert "node1" in graph.nodes
                assert "node2" in graph.nodes
                assert graph.nodes["node1"]["label"] == "Node 1"
                assert graph.nodes["node2"]["label"] == "Node 2"
                
                # Verify edges were added
                assert graph.has_edge("node1", "node2")
                assert graph.edges[("node1", "node2")]["label"] == "contains"
                
    def test_populate_graph_skips_schema_files(self):
        """Test that schema files are skipped."""
        mock_files = [
            "relation_types.yaml",
            "attribute_types.yaml", 
            "node_types.yaml",
            "valid_node.yaml"
        ]
        
        valid_node_data = {
            "node": {"id": "valid_node", "label": "Valid Node"},
            "relations": []
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node') as mock_load:
                mock_load.return_value = valid_node_data
                
                graph.clear()
                populate_graph()
                
                # Should only load the valid node, not schema files
                mock_load.assert_called_once_with("valid_node")
                assert "valid_node" in graph.nodes
                
    def test_populate_graph_skips_non_yaml_files(self):
        """Test that non-YAML files are skipped."""
        mock_files = ["node1.yaml", "node2.txt", "node3.json", "node4.yaml"]
        
        node_data = {
            "node": {"id": "test_node", "label": "Test Node"},
            "relations": []
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node') as mock_load:
                mock_load.return_value = node_data
                
                graph.clear()
                populate_graph()
                
                # Should only load YAML files
                assert mock_load.call_count == 2  # node1.yaml and node4.yaml
                
    def test_populate_graph_handles_missing_node_id(self):
        """Test handling of nodes without ID."""
        mock_files = ["node1.yaml"]
        
        node_data = {
            "node": {"label": "Node without ID"},  # No ID field
            "relations": []
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node', return_value=node_data):
                graph.clear()
                populate_graph()
                
                # Node without ID should not be added
                assert len(graph.nodes) == 0
                
    def test_populate_graph_handles_missing_relation_fields(self):
        """Test handling of relations with missing fields."""
        mock_files = ["node1.yaml"]
        
        node_data = {
            "node": {"id": "node1", "label": "Node 1"},
            "relations": [
                {"subject": "node1", "object": "node2", "name": "contains"},  # Valid
                {"subject": "node1", "object": "node3"},  # Missing name
                {"subject": "node1", "name": "contains"},  # Missing object
                {"object": "node2", "name": "contains"}   # Missing subject
            ]
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node', return_value=node_data):
                graph.clear()
                populate_graph()
                
                # Only the valid relation should be added
                assert len(graph.edges) == 1
                assert graph.has_edge("node1", "node2")
                
    def test_populate_graph_handles_load_errors(self):
        """Test handling of file loading errors."""
        mock_files = ["node1.yaml", "node2.yaml"]
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node') as mock_load:
                mock_load.side_effect = [FileNotFoundError("File not found"), {"node": {"id": "node2", "label": "Node 2"}}]
                
                graph.clear()
                populate_graph()
                
                # Should skip the file with error and continue with others
                assert "node2" in graph.nodes
                assert "node1" not in graph.nodes
                
    def test_populate_graph_clears_existing_graph(self):
        """Test that existing graph is cleared before populating."""
        # Add some existing data
        graph.add_node("existing_node", label="Existing")
        graph.add_edge("existing_node", "other_node", label="relation")
        
        mock_files = ["new_node.yaml"]
        node_data = {
            "node": {"id": "new_node", "label": "New Node"},
            "relations": []
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node', return_value=node_data):
                populate_graph()
                
                # Old data should be gone, new data should be present
                assert "existing_node" not in graph.nodes
                assert "new_node" in graph.nodes
                
    def test_populate_graph_complex_relationships(self):
        """Test populating graph with complex relationships."""
        mock_files = ["node1.yaml", "node2.yaml", "node3.yaml"]
        
        node1_data = {
            "node": {"id": "node1", "label": "Node 1"},
            "relations": [
                {"subject": "node1", "object": "node2", "name": "contains"},
                {"subject": "node1", "object": "node3", "name": "depends_on"}
            ]
        }
        node2_data = {
            "node": {"id": "node2", "label": "Node 2"},
            "relations": [
                {"subject": "node2", "object": "node3", "name": "is_part_of"}
            ]
        }
        node3_data = {
            "node": {"id": "node3", "label": "Node 3"},
            "relations": []
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node') as mock_load:
                mock_load.side_effect = [node1_data, node2_data, node3_data]
                
                graph.clear()
                populate_graph()
                
                # Verify all nodes are present
                assert "node1" in graph.nodes
                assert "node2" in graph.nodes
                assert "node3" in graph.nodes
                
                # Verify all edges are present
                assert graph.has_edge("node1", "node2")
                assert graph.has_edge("node1", "node3")
                assert graph.has_edge("node2", "node3")
                
                # Verify edge labels
                assert graph.edges[("node1", "node2")]["label"] == "contains"
                assert graph.edges[("node1", "node3")]["label"] == "depends_on"
                assert graph.edges[("node2", "node3")]["label"] == "is_part_of"


class TestGraphStateIntegration:
    """Integration test cases for graph state management."""
    
    def test_full_population_workflow(self):
        """Test the complete graph population workflow."""
        # Create temporary test data
        with tempfile.TemporaryDirectory() as temp_dir:
            global_dir = os.path.join(temp_dir, "graph_data", "global")
            os.makedirs(global_dir, exist_ok=True)
            
            # Create test YAML files
            node1_data = {
                "node": {"id": "test_node1", "label": "Test Node 1"},
                "relations": [
                    {"subject": "test_node1", "object": "test_node2", "name": "contains"}
                ]
            }
            node2_data = {
                "node": {"id": "test_node2", "label": "Test Node 2"},
                "relations": []
            }
            
            with open(os.path.join(global_dir, "node1.yaml"), 'w') as f:
                yaml.dump(node1_data, f)
            with open(os.path.join(global_dir, "node2.yaml"), 'w') as f:
                yaml.dump(node2_data, f)
            with open(os.path.join(global_dir, "relation_types.yaml"), 'w') as f:
                yaml.dump({"types": []}, f)  # Schema file
            
            # Mock the graph_data path
            with patch('os.path.join') as mock_join:
                def mock_join_side_effect(*args):
                    if args[0] == "graph_data" and args[1] == "global":
                        return os.path.join(temp_dir, "graph_data", "global")
                    return os.path.join(*args)
                mock_join.side_effect = mock_join_side_effect
                
                with patch('os.listdir', return_value=["node1.yaml", "node2.yaml", "relation_types.yaml"]):
                    graph.clear()
                    populate_graph()
                    
                    # Verify the graph was populated correctly
                    assert "test_node1" in graph.nodes
                    assert "test_node2" in graph.nodes
                    assert graph.has_edge("test_node1", "test_node2")
                    
    def test_graph_properties_after_population(self):
        """Test graph properties after population."""
        mock_files = ["node1.yaml", "node2.yaml", "node3.yaml"]
        
        node_data = {
            "node": {"id": "test_node", "label": "Test Node"},
            "relations": [
                {"subject": "test_node", "object": "other_node", "name": "relation"}
            ]
        }
        
        with patch('os.listdir', return_value=mock_files):
            with patch('backend.core.graph_state.load_global_node', return_value=node_data):
                graph.clear()
                populate_graph()
                
                # Test graph properties
                assert isinstance(graph, nx.DiGraph)
                assert len(graph.nodes) > 0
                assert len(graph.edges) > 0
                
                # Test node attributes
                for node_id, attrs in graph.nodes(data=True):
                    assert "label" in attrs
                    assert isinstance(attrs["label"], str)
                    
                # Test edge attributes
                for edge, attrs in graph.edges(data=True):
                    assert "label" in attrs
                    assert isinstance(attrs["label"], str)


if __name__ == "__main__":
    pytest.main([__file__]) 