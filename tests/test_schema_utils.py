"""
Unit tests for the schema_utils module.

This module tests the schema utility functions for filtering used schema types
from YAML files based on actual usage in parsed graphs.
"""

import pytest
import yaml
import tempfile
from pathlib import Path
from unittest.mock import patch, mock_open
from backend.core.schema_utils import filter_used_schema


class TestFilterUsedSchema:
    """Test the filter_used_schema function."""
    
    def test_filter_used_schema_basic(self):
        """Test basic filtering of used schema types."""
        parsed_data = {
            "nodes": [
                {
                    "id": "oxygen",
                    "relations": [{"name": "bonds_with"}],
                    "attributes": [{"name": "mass"}]
                }
            ]
        }
        
        global_relations = [
            {"name": "bonds_with", "inverse": "bonded_by"},
            {"name": "contains", "inverse": "contained_in"}
        ]
        
        global_attributes = [
            {"name": "mass", "data_type": "float", "unit": "kg"},
            {"name": "charge", "data_type": "float", "unit": "C"}
        ]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            parsed_yaml_path = Path(temp_dir) / "parsed.yaml"
            relation_schema_path = Path(temp_dir) / "relations.yaml"
            attribute_schema_path = Path(temp_dir) / "attributes.yaml"
            output_path = Path(temp_dir) / "used_schema.yaml"
            
            with open(parsed_yaml_path, 'w') as f:
                yaml.dump(parsed_data, f)
            with open(relation_schema_path, 'w') as f:
                yaml.dump(global_relations, f)
            with open(attribute_schema_path, 'w') as f:
                yaml.dump(global_attributes, f)
            
            result = filter_used_schema(
                str(parsed_yaml_path),
                str(relation_schema_path),
                str(attribute_schema_path),
                str(output_path)
            )
            
            assert len(result["relation_types"]) == 1
            assert result["relation_types"][0]["name"] == "bonds_with"
            assert len(result["attribute_types"]) == 1
            assert result["attribute_types"][0]["name"] == "mass"
    
    def test_filter_used_schema_empty_nodes(self):
        """Test filtering with empty nodes list."""
        parsed_data = {"nodes": []}
        global_relations = [{"name": "bonds_with", "inverse": "bonded_by"}]
        global_attributes = [{"name": "mass", "data_type": "float"}]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            parsed_yaml_path = Path(temp_dir) / "parsed.yaml"
            relation_schema_path = Path(temp_dir) / "relations.yaml"
            attribute_schema_path = Path(temp_dir) / "attributes.yaml"
            output_path = Path(temp_dir) / "used_schema.yaml"
            
            with open(parsed_yaml_path, 'w') as f:
                yaml.dump(parsed_data, f)
            with open(relation_schema_path, 'w') as f:
                yaml.dump(global_relations, f)
            with open(attribute_schema_path, 'w') as f:
                yaml.dump(global_attributes, f)
            
            result = filter_used_schema(
                str(parsed_yaml_path),
                str(relation_schema_path),
                str(attribute_schema_path),
                str(output_path)
            )
            
            assert len(result["relation_types"]) == 0
            assert len(result["attribute_types"]) == 0
    
    def test_filter_used_schema_no_relations_or_attributes(self):
        """Test filtering with nodes that have no relations or attributes."""
        parsed_data = {
            "nodes": [
                {"id": "oxygen", "relations": [], "attributes": []}
            ]
        }
        
        global_relations = [{"name": "bonds_with", "inverse": "bonded_by"}]
        global_attributes = [{"name": "mass", "data_type": "float"}]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            parsed_yaml_path = Path(temp_dir) / "parsed.yaml"
            relation_schema_path = Path(temp_dir) / "relations.yaml"
            attribute_schema_path = Path(temp_dir) / "attributes.yaml"
            output_path = Path(temp_dir) / "used_schema.yaml"
            
            with open(parsed_yaml_path, 'w') as f:
                yaml.dump(parsed_data, f)
            with open(relation_schema_path, 'w') as f:
                yaml.dump(global_relations, f)
            with open(attribute_schema_path, 'w') as f:
                yaml.dump(global_attributes, f)
            
            result = filter_used_schema(
                str(parsed_yaml_path),
                str(relation_schema_path),
                str(attribute_schema_path),
                str(output_path)
            )
            
            assert len(result["relation_types"]) == 0
            assert len(result["attribute_types"]) == 0
    
    def test_filter_used_schema_duplicate_usage(self):
        """Test that duplicate usage of relations/attributes is handled correctly."""
        parsed_data = {
            "nodes": [
                {
                    "id": "oxygen",
                    "relations": [{"name": "bonds_with"}, {"name": "bonds_with"}],
                    "attributes": [{"name": "mass"}, {"name": "mass"}]
                }
            ]
        }
        
        global_relations = [{"name": "bonds_with", "inverse": "bonded_by"}]
        global_attributes = [{"name": "mass", "data_type": "float"}]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            parsed_yaml_path = Path(temp_dir) / "parsed.yaml"
            relation_schema_path = Path(temp_dir) / "relations.yaml"
            attribute_schema_path = Path(temp_dir) / "attributes.yaml"
            output_path = Path(temp_dir) / "used_schema.yaml"
            
            with open(parsed_yaml_path, 'w') as f:
                yaml.dump(parsed_data, f)
            with open(relation_schema_path, 'w') as f:
                yaml.dump(global_relations, f)
            with open(attribute_schema_path, 'w') as f:
                yaml.dump(global_attributes, f)
            
            result = filter_used_schema(
                str(parsed_yaml_path),
                str(relation_schema_path),
                str(attribute_schema_path),
                str(output_path)
            )
            
            assert len(result["relation_types"]) == 1
            assert len(result["attribute_types"]) == 1
    
    def test_filter_used_schema_complex_structure(self):
        """Test filtering with complex nested structure."""
        parsed_data = {
            "nodes": [
                {
                    "id": "molecule",
                    "relations": [
                        {"name": "contains", "target": "atom1"},
                        {"name": "contains", "target": "atom2"},
                        {"name": "reacts_with", "target": "enzyme"}
                    ],
                    "attributes": [
                        {"name": "molecular_weight", "value": "18.015"},
                        {"name": "charge", "value": "0"},
                        {"name": "temperature", "value": "298"}
                    ]
                },
                {
                    "id": "atom1",
                    "relations": [{"name": "bonds_with", "target": "atom2"}],
                    "attributes": [{"name": "atomic_number", "value": "8"}]
                }
            ]
        }
        
        global_relations = [
            {"name": "contains", "inverse": "contained_in"},
            {"name": "reacts_with", "inverse": "reacted_by"},
            {"name": "bonds_with", "inverse": "bonded_by"},
            {"name": "catalyzes", "inverse": "catalyzed_by"}
        ]
        
        global_attributes = [
            {"name": "molecular_weight", "data_type": "float", "unit": "g/mol"},
            {"name": "charge", "data_type": "int", "unit": "e"},
            {"name": "temperature", "data_type": "float", "unit": "K"},
            {"name": "atomic_number", "data_type": "int"},
            {"name": "pressure", "data_type": "float", "unit": "Pa"}
        ]
        
        with tempfile.TemporaryDirectory() as temp_dir:
            parsed_yaml_path = Path(temp_dir) / "parsed.yaml"
            relation_schema_path = Path(temp_dir) / "relations.yaml"
            attribute_schema_path = Path(temp_dir) / "attributes.yaml"
            output_path = Path(temp_dir) / "used_schema.yaml"
            
            with open(parsed_yaml_path, 'w') as f:
                yaml.dump(parsed_data, f)
            with open(relation_schema_path, 'w') as f:
                yaml.dump(global_relations, f)
            with open(attribute_schema_path, 'w') as f:
                yaml.dump(global_attributes, f)
            
            result = filter_used_schema(
                str(parsed_yaml_path),
                str(relation_schema_path),
                str(attribute_schema_path),
                str(output_path)
            )
            
            # Check relations
            used_relation_names = {rel["name"] for rel in result["relation_types"]}
            expected_relations = {"contains", "reacts_with", "bonds_with"}
            assert used_relation_names == expected_relations
            
            # Check attributes
            used_attribute_names = {attr["name"] for attr in result["attribute_types"]}
            expected_attributes = {"molecular_weight", "charge", "temperature", "atomic_number"}
            assert used_attribute_names == expected_attributes
    
    def test_filter_used_schema_file_io_errors(self):
        """Test handling of file I/O errors."""
        with pytest.raises(FileNotFoundError):
            filter_used_schema(
                "nonexistent_parsed.yaml",
                "nonexistent_relations.yaml",
                "nonexistent_attributes.yaml",
                "output.yaml"
            )
    
    def test_filter_used_schema_yaml_parsing_errors(self):
        """Test handling of YAML parsing errors."""
        with tempfile.TemporaryDirectory() as temp_dir:
            parsed_yaml_path = Path(temp_dir) / "invalid.yaml"
            relation_schema_path = Path(temp_dir) / "relations.yaml"
            attribute_schema_path = Path(temp_dir) / "attributes.yaml"
            output_path = Path(temp_dir) / "used_schema.yaml"
            
            # Create invalid YAML file
            with open(parsed_yaml_path, 'w') as f:
                f.write("invalid: yaml: content: [")
            
            # Create valid schema files
            with open(relation_schema_path, 'w') as f:
                yaml.dump([{"name": "test"}], f)
            with open(attribute_schema_path, 'w') as f:
                yaml.dump([{"name": "test"}], f)
            
            with pytest.raises(yaml.YAMLError):
                filter_used_schema(
                    str(parsed_yaml_path),
                    str(relation_schema_path),
                    str(attribute_schema_path),
                    str(output_path)
                ) 