#!/usr/bin/env python3
"""
Script to fix the remaining test methods in test_morph_management.py
by adding the client parameter and removing the individual imports.
"""

import re

def fix_test_methods():
    with open('backend/tests/test_morph_management.py', 'r') as f:
        content = f.read()
    
    # Fix test_4
    content = re.sub(
        r'def test_4_create_duplicate_node_returns_existing\(self, setup_test_environment\):',
        'def test_4_create_duplicate_node_returns_existing(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_4_create_duplicate_node_returns_existing\(self, client, setup_test_environment\):\s*"""Test 4: Creating the same node twice returns 200 OK and the existing node ID/message on the second attempt\."""\s*user_id, graph_id = setup_test_environment\s*from fastapi\.testclient import TestClient\s*from main import app\s*client = TestClient\(app\)',
        'def test_4_create_duplicate_node_returns_existing(self, client, setup_test_environment):\n        """Test 4: Creating the same node twice returns 200 OK and the existing node ID/message on the second attempt."""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    # Fix test_5
    content = re.sub(
        r'def test_5_registry_driven_morph_management\(self, setup_test_environment\):',
        'def test_5_registry_driven_morph_management(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_5_registry_driven_morph_management\(self, client, setup_test_environment\):\s*"""Test 5: Verify that relation and attribute registries contain morph_id fields"""\s*user_id, graph_id = setup_test_environment\s*\s*from fastapi\.testclient import TestClient\s*from main import app\s*\s*client = TestClient\(app\)',
        'def test_5_registry_driven_morph_management(self, client, setup_test_environment):\n        """Test 5: Verify that relation and attribute registries contain morph_id fields"""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    # Fix test_6
    content = re.sub(
        r'def test_6_basic_morph_creation\(self, setup_test_environment\):',
        'def test_6_basic_morph_creation(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_6_basic_morph_creation\(self, client, setup_test_environment\):\s*"""Test 6: Create basic morph with relations and attributes for Oxygen"""\s*user_id, graph_id = setup_test_environment\s*\s*from fastapi\.testclient import TestClient\s*from main import app\s*\s*client = TestClient\(app\)',
        'def test_6_basic_morph_creation(self, client, setup_test_environment):\n        """Test 6: Create basic morph with relations and attributes for Oxygen"""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    # Fix test_7
    content = re.sub(
        r'def test_7_morph_creation_by_copying\(self, setup_test_environment\):',
        'def test_7_morph_creation_by_copying(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_7_morph_creation_by_copying\(self, client, setup_test_environment\):\s*"""Test 7: Create new morph by copying all properties from static morph"""\s*user_id, graph_id = setup_test_environment\s*\s*from fastapi\.testclient import TestClient\s*from main import app\s*\s*client = TestClient\(app\)',
        'def test_7_morph_creation_by_copying(self, client, setup_test_environment):\n        """Test 7: Create new morph by copying all properties from static morph"""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    # Fix test_8
    content = re.sub(
        r'def test_8_morph_operations\(self, setup_test_environment\):',
        'def test_8_morph_operations(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_8_morph_operations\(self, client, setup_test_environment\):\s*"""Test 8: Test morph operations \(move, copy, unlist\) on oxide_ion morph"""\s*user_id, graph_id = setup_test_environment\s*\s*from fastapi\.testclient import TestClient\s*from main import app\s*\s*client = TestClient\(app\)',
        'def test_8_morph_operations(self, client, setup_test_environment):\n        """Test 8: Test morph operations (move, copy, unlist) on oxide_ion morph"""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    # Fix test_9
    content = re.sub(
        r'def test_9_morph_context_property_creation\(self, setup_test_environment\):',
        'def test_9_morph_context_property_creation(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_9_morph_context_property_creation\(self, client, setup_test_environment\):\s*"""Test 9: Create relations/attributes in morph context when they already exist"""\s*user_id, graph_id = setup_test_environment\s*\s*from fastapi\.testclient import TestClient\s*from main import app\s*\s*client = TestClient\(app\)',
        'def test_9_morph_context_property_creation(self, client, setup_test_environment):\n        """Test 9: Create relations/attributes in morph context when they already exist"""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    # Fix test_10
    content = re.sub(
        r'def test_10_morph_creation_scenarios\(self, setup_test_environment\):',
        'def test_10_morph_creation_scenarios(self, client, setup_test_environment):',
        content
    )
    content = re.sub(
        r'def test_10_morph_creation_scenarios\(self, client, setup_test_environment\):\s*"""Test 10: Test different morph creation scenarios"""\s*user_id, graph_id = setup_test_environment\s*\s*from fastapi\.testclient import TestClient\s*from main import app\s*\s*client = TestClient\(app\)',
        'def test_10_morph_creation_scenarios(self, client, setup_test_environment):\n        """Test 10: Test different morph creation scenarios"""\n        user_id, graph_id = setup_test_environment',
        content
    )
    
    with open('backend/tests/test_morph_management.py', 'w') as f:
        f.write(content)
    
    print("Fixed all test methods in test_morph_management.py")

if __name__ == "__main__":
    fix_test_methods() 