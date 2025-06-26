"""
Test cases for the validation module.
These tests ensure that our validation rules are working correctly.
"""

import pytest
import json
import yaml
from pathlib import Path
from unittest.mock import patch, mock_open
from fastapi import HTTPException

from core.validation import (
    validate_user_exists,
    validate_graph_exists,
    get_user_graphs,
    validate_operation_context,
    ensure_user_directory_structure,
    ensure_graph_directory_structure,
    validate_node_exists,
    validate_relation_exists,
    validate_attribute_exists,
    require_user_and_graph,
    require_user_exists,
    require_node_exists,
    require_relation_exists,
    require_attribute_exists
)


class TestUserValidation:
    """Test cases for user validation"""
    
    def test_validate_user_exists_with_invalid_user_id(self):
        """Test that invalid user IDs raise HTTPException"""
        with pytest.raises(HTTPException) as exc_info:
            validate_user_exists("")
        assert exc_info.value.status_code == 400
        assert "Invalid user_id" in exc_info.value.detail
        
        with pytest.raises(HTTPException) as exc_info:
            validate_user_exists(None)
        assert exc_info.value.status_code == 400
        
        with pytest.raises(HTTPException) as exc_info:
            validate_user_exists("   ")
        assert exc_info.value.status_code == 400
    
    @patch('pathlib.Path.exists')
    def test_validate_user_exists_user_dir_not_exists(self, mock_exists):
        """Test that non-existent user directory returns False"""
        mock_exists.return_value = False
        assert validate_user_exists("testuser") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_user_exists_no_registry_file(self, mock_file, mock_exists):
        """Test that user without registry file returns False"""
        # User dir exists, but no registry file
        mock_exists.side_effect = [True, False]
        assert validate_user_exists("testuser") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_user_exists_invalid_registry_json(self, mock_file, mock_exists):
        """Test that invalid JSON in registry returns False"""
        mock_exists.side_effect = [True, True]
        mock_file.return_value.__enter__.return_value.read.return_value = "invalid json"
        
        with patch('json.load') as mock_json_load:
            mock_json_load.side_effect = json.JSONDecodeError("", "", 0)
            assert validate_user_exists("testuser") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_user_exists_user_not_in_registry(self, mock_file, mock_exists):
        """Test that user not in registry returns False"""
        mock_exists.side_effect = [True, True]
        mock_file.return_value.__enter__.return_value.read.return_value = '{"otheruser": {}}'
        
        with patch('json.load') as mock_json_load:
            mock_json_load.return_value = {"otheruser": {}}
            assert validate_user_exists("testuser") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_user_exists_valid_user(self, mock_file, mock_exists):
        """Test that valid user returns True"""
        mock_exists.side_effect = [True, True]
        mock_file.return_value.__enter__.return_value.read.return_value = '{"testuser": {}}'
        
        with patch('json.load') as mock_json_load:
            mock_json_load.return_value = {"testuser": {}}
            assert validate_user_exists("testuser") == True


class TestGraphValidation:
    """Test cases for graph validation"""
    
    def test_validate_graph_exists_with_invalid_graph_id(self):
        """Test that invalid graph IDs raise HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=True):
            with pytest.raises(HTTPException) as exc_info:
                validate_graph_exists("testuser", "")
            assert exc_info.value.status_code == 400
            assert "Invalid graph_id" in exc_info.value.detail
    
    def test_validate_graph_exists_user_not_exists(self):
        """Test that non-existent user raises HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                validate_graph_exists("testuser", "testgraph")
            assert exc_info.value.status_code == 404
            assert "User 'testuser' does not exist" in exc_info.value.detail
    
    @patch('pathlib.Path.exists')
    def test_validate_graph_exists_graph_dir_not_exists(self, mock_exists):
        """Test that non-existent graph directory returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = False
            assert validate_graph_exists("testuser", "testgraph") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_graph_exists_no_metadata_file(self, mock_file, mock_exists):
        """Test that graph without metadata file returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            # Graph dir exists, but no metadata file
            mock_exists.side_effect = [True, False]
            assert validate_graph_exists("testuser", "testgraph") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_graph_exists_invalid_yaml(self, mock_file, mock_exists):
        """Test that invalid YAML in metadata returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.side_effect = [True, True]
            mock_file.return_value.__enter__.return_value.read.return_value = "invalid: yaml: ["
            
            with patch('yaml.safe_load') as mock_yaml_load:
                mock_yaml_load.side_effect = yaml.YAMLError("")
                assert validate_graph_exists("testuser", "testgraph") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_graph_exists_invalid_metadata_structure(self, mock_file, mock_exists):
        """Test that metadata without name field returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.side_effect = [True, True]
            mock_file.return_value.__enter__.return_value.read.return_value = "description: test"
            
            with patch('yaml.safe_load') as mock_yaml_load:
                mock_yaml_load.return_value = {"description": "test"}
                assert validate_graph_exists("testuser", "testgraph") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_graph_exists_valid_graph(self, mock_file, mock_exists):
        """Test that valid graph returns True"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.side_effect = [True, True]
            mock_file.return_value.__enter__.return_value.read.return_value = "name: Test Graph"
            
            with patch('yaml.safe_load') as mock_yaml_load:
                mock_yaml_load.return_value = {"name": "Test Graph"}
                assert validate_graph_exists("testuser", "testgraph") == True


class TestOperationContextValidation:
    """Test cases for operation context validation"""
    
    def test_validate_operation_context_user_not_exists(self):
        """Test that non-existent user raises HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                validate_operation_context("testuser", "testgraph", "create node")
            assert exc_info.value.status_code == 404
            assert "Cannot create node: User 'testuser' does not exist" in exc_info.value.detail
    
    def test_validate_operation_context_graph_not_exists(self):
        """Test that non-existent graph raises HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=False):
                with pytest.raises(HTTPException) as exc_info:
                    validate_operation_context("testuser", "testgraph", "create node")
                assert exc_info.value.status_code == 404
                assert "Cannot create node: Graph 'testgraph' does not exist" in exc_info.value.detail
    
    def test_validate_operation_context_valid_context(self):
        """Test that valid user and graph context passes validation"""
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                # Should not raise any exception
                validate_operation_context("testuser", "testgraph", "create node")


class TestGetUserGraphs:
    """Test cases for getting user graphs"""
    
    def test_get_user_graphs_user_not_exists(self):
        """Test that non-existent user raises HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                get_user_graphs("testuser")
            assert exc_info.value.status_code == 404
            assert "User 'testuser' does not exist" in exc_info.value.detail
    
    @patch('pathlib.Path.exists')
    def test_get_user_graphs_no_graphs_dir(self, mock_exists):
        """Test that user without graphs directory returns empty list"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = False
            assert get_user_graphs("testuser") == []
    
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.iterdir')
    def test_get_user_graphs_no_valid_graphs(self, mock_iterdir, mock_exists):
        """Test that user with no valid graphs returns empty list"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = True
            mock_iterdir.return_value = []  # No graph directories
            assert get_user_graphs("testuser") == []
    
    @patch('pathlib.Path.exists')
    @patch('pathlib.Path.iterdir')
    @patch('builtins.open', new_callable=mock_open)
    def test_get_user_graphs_valid_graphs(self, mock_file, mock_iterdir, mock_exists):
        """Test that user with valid graphs returns graph list"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.side_effect = [True, True, True]  # User exists, graphs dir exists, metadata exists
            mock_iterdir.return_value = [Path("testgraph")]
            mock_file.return_value.__enter__.return_value.read.return_value = "name: Test Graph"
            
            with patch('yaml.safe_load') as mock_yaml_load:
                mock_yaml_load.return_value = {"name": "Test Graph", "description": "A test graph"}
                graphs = get_user_graphs("testuser")
                
                assert len(graphs) == 1
                assert graphs[0]["id"] == "testgraph"
                assert graphs[0]["name"] == "Test Graph"
                assert graphs[0]["description"] == "A test graph"


class TestDirectoryStructure:
    """Test cases for directory structure creation"""
    
    def test_ensure_user_directory_structure_invalid_user_id(self):
        """Test that invalid user ID raises HTTPException"""
        with pytest.raises(HTTPException) as exc_info:
            ensure_user_directory_structure("")
        assert exc_info.value.status_code == 400
        assert "Invalid user_id" in exc_info.value.detail
    
    @patch('pathlib.Path.mkdir')
    def test_ensure_user_directory_structure_creates_dirs(self, mock_mkdir):
        """Test that user directory structure is created"""
        ensure_user_directory_structure("testuser")
        # Should call mkdir for user dir and subdirectories
        assert mock_mkdir.call_count >= 5  # user dir + 4 subdirs
    
    def test_ensure_graph_directory_structure_user_not_exists(self):
        """Test that non-existent user raises HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                ensure_graph_directory_structure("testuser", "testgraph")
            assert exc_info.value.status_code == 404
            assert "User 'testuser' does not exist" in exc_info.value.detail
    
    def test_ensure_graph_directory_structure_invalid_graph_id(self):
        """Test that invalid graph ID raises HTTPException"""
        with patch('core.validation.validate_user_exists', return_value=True):
            with pytest.raises(HTTPException) as exc_info:
                ensure_graph_directory_structure("testuser", "")
            assert exc_info.value.status_code == 400
            assert "Invalid graph_id" in exc_info.value.detail
    
    @patch('pathlib.Path.mkdir')
    def test_ensure_graph_directory_structure_creates_graph_dir(self, mock_mkdir):
        """Test that graph directory is created"""
        with patch('core.validation.validate_user_exists', return_value=True):
            ensure_graph_directory_structure("testuser", "testgraph")
            # Should call mkdir for graph directory
            assert mock_mkdir.call_count >= 1


class TestEntityValidation:
    """Test cases for entity (node, relation, attribute) validation"""
    
    def test_validate_node_exists_user_not_exists(self):
        """Test that non-existent user returns False for node validation"""
        with patch('core.validation.validate_user_exists', return_value=False):
            assert validate_node_exists("testuser", "testnode") == False
    
    @patch('pathlib.Path.exists')
    def test_validate_node_exists_node_file_not_exists(self, mock_exists):
        """Test that non-existent node file returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = False
            assert validate_node_exists("testuser", "testnode") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_node_exists_invalid_json(self, mock_file, mock_exists):
        """Test that invalid JSON in node file returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = True
            mock_file.return_value.__enter__.return_value.read.return_value = "invalid json"
            
            with patch('json.load') as mock_json_load:
                mock_json_load.side_effect = json.JSONDecodeError("", "", 0)
                assert validate_node_exists("testuser", "testnode") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_node_exists_valid_node(self, mock_file, mock_exists):
        """Test that valid node returns True"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = True
            mock_file.return_value.__enter__.return_value.read.return_value = '{"id": "testnode"}'
            
            with patch('json.load') as mock_json_load:
                mock_json_load.return_value = {"id": "testnode"}
                assert validate_node_exists("testuser", "testnode") == True
    
    def test_validate_relation_exists_user_not_exists(self):
        """Test that non-existent user returns False for relation validation"""
        with patch('core.validation.validate_user_exists', return_value=False):
            assert validate_relation_exists("testuser", "testrelation") == False
    
    @patch('pathlib.Path.exists')
    def test_validate_relation_exists_relation_file_not_exists(self, mock_exists):
        """Test that non-existent relation file returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = False
            assert validate_relation_exists("testuser", "testrelation") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_relation_exists_valid_relation(self, mock_file, mock_exists):
        """Test that valid relation returns True"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = True
            mock_file.return_value.__enter__.return_value.read.return_value = '{"id": "testrelation"}'
            
            with patch('json.load') as mock_json_load:
                mock_json_load.return_value = {"id": "testrelation"}
                assert validate_relation_exists("testuser", "testrelation") == True
    
    def test_validate_attribute_exists_user_not_exists(self):
        """Test that non-existent user returns False for attribute validation"""
        with patch('core.validation.validate_user_exists', return_value=False):
            assert validate_attribute_exists("testuser", "testattribute") == False
    
    @patch('pathlib.Path.exists')
    def test_validate_attribute_exists_attribute_file_not_exists(self, mock_exists):
        """Test that non-existent attribute file returns False"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = False
            assert validate_attribute_exists("testuser", "testattribute") == False
    
    @patch('pathlib.Path.exists')
    @patch('builtins.open', new_callable=mock_open)
    def test_validate_attribute_exists_valid_attribute(self, mock_file, mock_exists):
        """Test that valid attribute returns True"""
        with patch('core.validation.validate_user_exists', return_value=True):
            mock_exists.return_value = True
            mock_file.return_value.__enter__.return_value.read.return_value = '{"id": "testattribute"}'
            
            with patch('json.load') as mock_json_load:
                mock_json_load.return_value = {"id": "testattribute"}
                assert validate_attribute_exists("testuser", "testattribute") == True


class TestDecoratorValidation:
    """Test cases for decorator-based validation"""
    
    def test_require_user_and_graph_decorator_user_not_exists(self):
        """Test that decorator raises HTTPException when user doesn't exist"""
        @require_user_and_graph("create node")
        def test_function(user_id: str, graph_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                test_function("testuser", "testgraph")
            assert exc_info.value.status_code == 404
            assert "Cannot create node: User 'testuser' does not exist" in exc_info.value.detail
    
    def test_require_user_and_graph_decorator_graph_not_exists(self):
        """Test that decorator raises HTTPException when graph doesn't exist"""
        @require_user_and_graph("create node")
        def test_function(user_id: str, graph_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=False):
                with pytest.raises(HTTPException) as exc_info:
                    test_function("testuser", "testgraph")
                assert exc_info.value.status_code == 404
                assert "Cannot create node: Graph 'testgraph' does not exist" in exc_info.value.detail
    
    def test_require_user_and_graph_decorator_success(self):
        """Test that decorator allows function execution when validation passes"""
        @require_user_and_graph("create node")
        def test_function(user_id: str, graph_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                result = test_function("testuser", "testgraph")
                assert result == "success"
    
    def test_require_user_and_graph_decorator_with_keyword_args(self):
        """Test that decorator works with keyword arguments"""
        @require_user_and_graph("create node")
        def test_function(user_id: str, graph_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                result = test_function(user_id="testuser", graph_id="testgraph")
                assert result == "success"
    
    def test_require_user_exists_decorator_user_not_exists(self):
        """Test that user-only decorator raises HTTPException when user doesn't exist"""
        @require_user_exists("list graphs")
        def test_function(user_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                test_function("testuser")
            assert exc_info.value.status_code == 404
            assert "Cannot list graphs: User 'testuser' does not exist" in exc_info.value.detail
    
    def test_require_user_exists_decorator_success(self):
        """Test that user-only decorator allows function execution when validation passes"""
        @require_user_exists("list graphs")
        def test_function(user_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            result = test_function("testuser")
            assert result == "success"
    
    def test_require_node_exists_decorator_node_not_exists(self):
        """Test that node decorator raises HTTPException when node doesn't exist"""
        @require_node_exists("update node")
        def test_function(user_id: str, graph_id: str, node_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                with patch('core.validation.validate_node_exists', return_value=False):
                    with pytest.raises(HTTPException) as exc_info:
                        test_function("testuser", "testgraph", "testnode")
                    assert exc_info.value.status_code == 404
                    assert "Cannot update node: Node 'testnode' does not exist" in exc_info.value.detail
    
    def test_require_node_exists_decorator_success(self):
        """Test that node decorator allows function execution when validation passes"""
        @require_node_exists("update node")
        def test_function(user_id: str, graph_id: str, node_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                with patch('core.validation.validate_node_exists', return_value=True):
                    result = test_function("testuser", "testgraph", "testnode")
                    assert result == "success"
    
    def test_require_relation_exists_decorator_relation_not_exists(self):
        """Test that relation decorator raises HTTPException when relation doesn't exist"""
        @require_relation_exists("update relation")
        def test_function(user_id: str, graph_id: str, relation_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                with patch('core.validation.validate_relation_exists', return_value=False):
                    with pytest.raises(HTTPException) as exc_info:
                        test_function("testuser", "testgraph", "testrelation")
                    assert exc_info.value.status_code == 404
                    assert "Cannot update relation: Relation 'testrelation' does not exist" in exc_info.value.detail
    
    def test_require_relation_exists_decorator_success(self):
        """Test that relation decorator allows function execution when validation passes"""
        @require_relation_exists("update relation")
        def test_function(user_id: str, graph_id: str, relation_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                with patch('core.validation.validate_relation_exists', return_value=True):
                    result = test_function("testuser", "testgraph", "testrelation")
                    assert result == "success"
    
    def test_require_attribute_exists_decorator_attribute_not_exists(self):
        """Test that attribute decorator raises HTTPException when attribute doesn't exist"""
        @require_attribute_exists("update attribute")
        def test_function(user_id: str, graph_id: str, attribute_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                with patch('core.validation.validate_attribute_exists', return_value=False):
                    with pytest.raises(HTTPException) as exc_info:
                        test_function("testuser", "testgraph", "testattribute")
                    assert exc_info.value.status_code == 404
                    assert "Cannot update attribute: Attribute 'testattribute' does not exist" in exc_info.value.detail
    
    def test_require_attribute_exists_decorator_success(self):
        """Test that attribute decorator allows function execution when validation passes"""
        @require_attribute_exists("update attribute")
        def test_function(user_id: str, graph_id: str, attribute_id: str):
            return "success"
        
        with patch('core.validation.validate_user_exists', return_value=True):
            with patch('core.validation.validate_graph_exists', return_value=True):
                with patch('core.validation.validate_attribute_exists', return_value=True):
                    result = test_function("testuser", "testgraph", "testattribute")
                    assert result == "success" 