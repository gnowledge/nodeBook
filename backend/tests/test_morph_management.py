import os
import json
import pytest
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

class TestMorphManagement:
    @pytest.fixture
    def setup_test_environment(self):
        """Setup test environment using real graph_data directory"""
        user_id = "testuser"
        graph_id = "testGraph"
        
        # Clean up any existing test data
        graph_data_path = Path("graph_data")
        user_path = graph_data_path / "users" / user_id
        graph_path = user_path / "graphs" / graph_id
        
        # Remove existing test graph if it exists
        if graph_path.exists():
            shutil.rmtree(graph_path)
        
        # Remove existing test nodes if they exist
        node_path = user_path / "nodes"
        if node_path.exists():
            for node_file in node_path.glob("*.json"):
                if "test" in node_file.name.lower():
                    node_file.unlink()
        
        yield user_id, graph_id
        
        # Cleanup after tests
        if graph_path.exists():
            shutil.rmtree(graph_path)
        
        # Clean up test nodes
        if node_path.exists():
            for node_file in node_path.glob("*.json"):
                if "test" in node_file.name.lower():
                    node_file.unlink()

    def test_1_create_graph(self, setup_test_environment):
        """Test 1: Create a graph in the user space"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # Create a graph via HTTP endpoint
        graph_data = {
            "title": "Test Graph",
            "description": "A test graph for morph management"
        }
        
        response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}",
            json=graph_data
        )
        
        # Debug output
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.text}")
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify the graph was created successfully
        assert "status" in result
        assert "graph" in result
        assert result["graph"] == graph_id
        
        # Verify the graph files were created
        graph_path = Path("graph_data") / "users" / user_id / "graphs" / graph_id
        assert graph_path.exists()
        assert (graph_path / "metadata.yaml").exists()
        assert (graph_path / "cnl.md").exists()
        assert (graph_path / "composed.json").exists()
        assert (graph_path / "composed.yaml").exists()
        
        return graph_id

    def test_2_create_node(self, setup_test_environment):
        """Test 2: Create a node in the graph"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First create a graph
        graph_data = {
            "title": "Test Graph",
            "description": "A test graph for morph management"
        }
        
        graph_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}",
            json=graph_data
        )
        
        assert graph_response.status_code == 200
        
        # Now create a node in that graph
        node_data = {
            "name": "Test Node",
            "base_name": "Test",
            "role": "individual",
            "description": "A test node for morph management"
        }
        
        response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=node_data
        )
        
        # Debug output
        if response.status_code != 200:
            print(f"Response status: {response.status_code}")
            print(f"Response content: {response.text}")
        
        assert response.status_code == 200
        result = response.json()
        
        # Print the actual response to see what fields are available
        print(f"Node creation response: {result}")
        
        # Verify the node was created successfully
        assert "id" in result
        assert "status" in result
        assert result["status"] == "PolyNode created and registered"
        assert result["id"] == "Test"  # The ID should be the base_name
        
        # Store the node_id for future tests
        node_id = result["id"]
        
        # Verify the node file was created
        node_file = Path("graph_data") / "users" / user_id / "nodes" / f"{node_id}.json"
        assert node_file.exists()
        
        return node_id

    def test_3_create_oxygen_with_relation(self, setup_test_environment):
        """Test 3: Create Oxygen node and relation, verify morph structure"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First create a graph and Oxygen node
        graph_data = {
            "title": "Chemistry Graph",
            "description": "A graph for testing oxygen and elements"
        }
        
        graph_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}",
            json=graph_data
        )
        assert graph_response.status_code == 200
        
        # Create Oxygen node
        oxygen_node_data = {
            "name": "Oxygen",
            "base_name": "Oxygen",
            "role": "individual",
            "description": "A chemical element with atomic number 8"
        }
        
        oxygen_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=oxygen_node_data
        )
        assert oxygen_response.status_code == 200
        oxygen_result = oxygen_response.json()
        oxygen_id = oxygen_result["id"]
        
        # Create Element node (target for the relation)
        element_node_data = {
            "name": "Element",
            "base_name": "Element", 
            "role": "class",
            "description": "A class of chemical elements"
        }
        
        element_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=element_node_data
        )
        
        print(f"Element node creation response: {element_response.json()}")
        assert element_response.status_code == 200
        element_result = element_response.json()
        element_id = element_result["id"]
        
        # Create relation: oxygen is_a element
        relation_data = {
            "name": "is_a",
            "source_id": oxygen_id,
            "target_id": element_id,
            "adverb": None,
            "modality": None
        }
        
        relation_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/relation/create",
            json=relation_data
        )
        
        print(f"Relation creation response: {relation_response.json()}")
        assert relation_response.status_code == 200
        relation_result = relation_response.json()
        relation_id = relation_result["relation_id"]
        
        # Now verify the morph structure in the Oxygen node
        # Read the Oxygen node file to check its morphs
        oxygen_node_file = Path("graph_data") / "users" / user_id / "nodes" / f"{oxygen_id}.json"
        assert oxygen_node_file.exists()
        
        with open(oxygen_node_file, 'r') as f:
            oxygen_node_content = json.load(f)
        
        print(f"Oxygen node content: {json.dumps(oxygen_node_content, indent=2)}")
        
        # Verify the node has morphs
        assert "morphs" in oxygen_node_content
        morphs = oxygen_node_content["morphs"]
        assert len(morphs) > 0
        
        # Find the static_oxygen morph
        static_oxygen_morph = None
        for morph in morphs:
            if morph.get("name") == "static":
                static_oxygen_morph = morph
                break
        
        assert static_oxygen_morph is not None, "static morph not found"
        
        # Verify the morph has relationNode_ids and contains our relation
        assert "relationNode_ids" in static_oxygen_morph
        relation_ids = static_oxygen_morph["relationNode_ids"]
        assert relation_id in relation_ids, f"Relation {relation_id} not found in morph relationNode_ids: {relation_ids}"
        
        # Verify the nbh field points to the static_oxygen morph
        assert "nbh" in oxygen_node_content
        assert oxygen_node_content["nbh"] == "static_Oxygen"
        
        # Verify the morph_id in the relation points to the static_oxygen morph
        relation_file = Path("graph_data") / "users" / user_id / "relationNodes" / f"{relation_id}.json"
        assert relation_file.exists()
        
        with open(relation_file, 'r') as f:
            relation_content = json.load(f)
        
        print(f"Relation content: {json.dumps(relation_content, indent=2)}")
        
        assert "morph_id" in relation_content
        assert relation_content["morph_id"] == ["static_Oxygen"]
        
        return oxygen_id, relation_id 

    def test_4_create_duplicate_node_returns_existing(self, setup_test_environment):
        """Test 4: Creating the same node twice returns 200 OK and the existing node ID/message on the second attempt."""
        user_id, graph_id = setup_test_environment
        from fastapi.testclient import TestClient
        from main import app
        client = TestClient(app)

        # Ensure Oxygen node does not exist
        oxygen_node_file = Path("graph_data") / "users" / user_id / "nodes" / "Oxygen.json"
        if oxygen_node_file.exists():
            oxygen_node_file.unlink()
        # Remove from registry if present
        node_registry_file = Path("graph_data") / "users" / user_id / "node_registry.json"
        if node_registry_file.exists():
            import json
            with open(node_registry_file, "r") as f:
                registry = json.load(f)
            if "Oxygen" in registry:
                del registry["Oxygen"]
                with open(node_registry_file, "w") as f:
                    json.dump(registry, f)

        # Create the graph
        graph_data = {
            "title": "Chemistry Graph",
            "description": "A graph for testing oxygen and elements"
        }
        graph_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}",
            json=graph_data
        )
        assert graph_response.status_code == 200

        # First creation
        oxygen_node_data = {
            "name": "Oxygen",
            "base_name": "Oxygen",
            "role": "individual",
            "description": "A chemical element with atomic number 8"
        }
        response1 = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=oxygen_node_data
        )
        assert response1.status_code == 200
        result1 = response1.json()
        assert result1["id"] == "Oxygen"
        print(f"First creation response: {result1}")

        # Second creation (should not fail, should return existing node info)
        response2 = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=oxygen_node_data
        )
        assert response2.status_code == 200
        result2 = response2.json()
        print(f"Second creation response: {result2}")
        assert result2["id"] == "Oxygen"
        assert "already exists" in result2["status"].lower()

    def test_5_registry_driven_morph_management(self, setup_test_environment):
        """Test 5: Verify that relation and attribute registries contain morph_id fields"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # Create a graph
        graph_data = {
            "title": "Registry Test Graph",
            "description": "Testing registry-driven morph management"
        }
        
        graph_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}",
            json=graph_data
        )
        assert graph_response.status_code == 200
        
        # Create a node
        node_data = {
            "base_name": "Carbon",
            "description": "A chemical element with atomic number 6"
        }
        
        node_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=node_data
        )
        assert node_response.status_code == 200
        carbon_id = node_response.json()["id"]
        
        # Create a relation with explicit morph_id
        relation_data = {
            "name": "is_a",
            "source_id": carbon_id,
            "target_id": "Element",
            "morph_id": "organic_Carbon",  # Explicit morph_id
            "adverb": None,
            "modality": None
        }
        
        relation_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/relation/create",
            json=relation_data
        )
        assert relation_response.status_code == 200
        relation_id = relation_response.json()["relation_id"]
        
        # Create an attribute with explicit morph_id
        attribute_data = {
            "name": "atomic number",
            "source_id": carbon_id,
            "value": 6,
            "morph_id": "organic_Carbon",  # Explicit morph_id
            "unit": None,
            "adverb": None,
            "modality": None
        }
        
        attribute_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/attribute/create",
            json=attribute_data
        )
        
        if attribute_response.status_code != 200:
            print(f"Attribute creation failed:")
            print(f"Status: {attribute_response.status_code}")
            print(f"Response: {attribute_response.text}")
        
        assert attribute_response.status_code == 200
        attribute_id = attribute_response.json()["attribute_id"]
        
        # Verify relation registry contains morph_id
        relation_registry_path = Path(f"graph_data/users/{user_id}/relation_registry.json")
        assert relation_registry_path.exists()
        
        with open(relation_registry_path, 'r') as f:
            relation_registry = json.load(f)
        
        assert relation_id in relation_registry
        registry_entry = relation_registry[relation_id]
        assert "morph_id" in registry_entry
        assert registry_entry["morph_id"] == ["organic_Carbon"]
        
        # Verify attribute registry contains morph_id
        attribute_registry_path = Path(f"graph_data/users/{user_id}/attribute_registry.json")
        assert attribute_registry_path.exists()
        
        with open(attribute_registry_path, 'r') as f:
            attribute_registry = json.load(f)
        
        assert attribute_id in attribute_registry
        registry_entry = attribute_registry[attribute_id]
        assert "morph_id" in registry_entry
        assert registry_entry["morph_id"] == ["organic_Carbon"]
        
        # Verify relation file contains morph_id
        relation_file_path = Path(f"graph_data/users/{user_id}/relationNodes/{relation_id}.json")
        assert relation_file_path.exists()
        
        with open(relation_file_path, 'r') as f:
            relation_content = json.load(f)
        
        assert "morph_id" in relation_content
        assert relation_content["morph_id"] == "organic_Carbon"
        
        # Verify attribute file contains morph_id
        attribute_file_path = Path(f"graph_data/users/{user_id}/attributeNodes/{attribute_id}.json")
        assert attribute_file_path.exists()
        
        with open(attribute_file_path, 'r') as f:
            attribute_content = json.load(f)
        
        assert "morph_id" in attribute_content
        assert attribute_content["morph_id"] == ["organic_Carbon"]
        
        # Verify node morph structure
        node_file_path = Path(f"graph_data/users/{user_id}/nodes/{carbon_id}.json")
        assert node_file_path.exists()
        
        with open(node_file_path, 'r') as f:
            node_content = json.load(f)
        
        # Should have organic_Carbon morph
        morphs = node_content.get("morphs", [])
        organic_morph = None
        for morph in morphs:
            if morph.get("morph_id") == "organic_Carbon":
                organic_morph = morph
                break
        
        assert organic_morph is not None
        assert relation_id in organic_morph.get("relationNode_ids", [])
        assert attribute_id in organic_morph.get("attributeNode_ids", [])
        
        print(f"✅ Registry-driven morph management verified:")
        print(f"   - Relation registry contains morph_id: {registry_entry['morph_id']}")
        print(f"   - Attribute registry contains morph_id: {attribute_registry[attribute_id]['morph_id']}")
        print(f"   - Relation file contains morph_id: {relation_content['morph_id']}")
        print(f"   - Attribute file contains morph_id: {attribute_content['morph_id']}")
        print(f"   - Node morph structure correctly references both relation and attribute")
        
        return carbon_id, relation_id, attribute_id

    def test_6_basic_morph_creation(self, setup_test_environment):
        """Test 6: Create basic morph with relations and attributes for Oxygen"""
        user_id, graph_id = setup_test_environment
    
        from fastapi.testclient import TestClient
        from main import app
    
        client = TestClient(app)
    
        # First create a graph and Oxygen node
        graph_data = {
            "title": "Chemistry Graph",
            "description": "A graph for testing oxygen and elements"
        }
        
        graph_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}",
            json=graph_data
        )
        assert graph_response.status_code == 200
        
        # Create Oxygen node
        oxygen_node_data = {
            "name": "Oxygen",
            "base_name": "Oxygen",
            "role": "individual",
            "description": "A chemical element with atomic number 8"
        }
        
        oxygen_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes",
            json=oxygen_node_data
        )
        assert oxygen_response.status_code == 200
        oxygen_result = oxygen_response.json()
        oxygen_id = oxygen_result["id"]
    
        # Create a relation for Oxygen (should go to basic morph)
        relation_data = {
            "source_id": oxygen_id,
            "name": "is_a",
            "target_id": "Element",
            "description": "Testing basic morph creation with Oxygen"
        }
    
        relation_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/relation/create",
            json=relation_data
        )
    
        assert relation_response.status_code == 200
        relation_result = relation_response.json()
        relation_id = relation_result["relation_id"]
    
        # Add attributes to Oxygen (all should go to basic morph)
        attributes = [
            {"name": "atomic number", "value": 8, "unit": ""},
            {"name": "proton number", "value": 8, "unit": ""},
            {"name": "electron number", "value": 8, "unit": ""},
            {"name": "neutron number", "value": 8, "unit": ""}
        ]
    
        attribute_ids = []
        for attr in attributes:
            attr_data = {
                "source_id": oxygen_id,
                **attr
            }
            attr_response = client.post(
                f"/api/ndf/users/{user_id}/graphs/{graph_id}/attribute/create",
                json=attr_data
            )
            assert attr_response.status_code == 200
            attr_result = attr_response.json()
            attribute_ids.append(attr_result["attribute_id"])
    
        # Verify all attributes and relation are in basic morph
        node_file_path = Path(f"graph_data/users/{user_id}/nodes/{oxygen_id}.json")
        assert node_file_path.exists()
    
        with open(node_file_path, 'r') as f:
            oxygen_node_content = json.load(f)
    
        # Should have basic_Oxygen morph
        morphs = oxygen_node_content.get("morphs", [])
        basic_morph = None
        for morph in morphs:
            if morph.get("morph_id") == "basic_Oxygen":
                basic_morph = morph
                break
    
        assert basic_morph is not None, "Basic morph should exist"
        assert relation_id in basic_morph.get("relationNode_ids", []), "Relation should be in basic morph"
    
        for attr_id in attribute_ids:
            assert attr_id in basic_morph.get("attributeNode_ids", []), f"Attribute {attr_id} should be in basic morph"
    
        # Verify all attributes have basic morph_id in registry
        attribute_registry_path = Path(f"graph_data/users/{user_id}/attribute_registry.json")
        assert attribute_registry_path.exists()
    
        with open(attribute_registry_path, 'r') as f:
            attribute_registry = json.load(f)
    
        for attr_id in attribute_ids:
            assert attribute_registry[attr_id]["morph_id"] == ["basic_Oxygen"]
    
        # Verify relation has basic morph_id in registry
        relation_registry_path = Path(f"graph_data/users/{user_id}/relation_registry.json")
        assert relation_registry_path.exists()
    
        with open(relation_registry_path, 'r') as f:
            relation_registry = json.load(f)
    
        assert relation_registry[relation_id]["morph_id"] == ["basic_Oxygen"]
    
        print(f"✅ Basic morph creation verified:")
        print(f"   - Oxygen node created with basic_Oxygen morph")
        print(f"   - Relation 'is_a element' added to basic morph")
        print(f"   - 4 attributes added to basic morph: atomic number, proton number, electron number, neutron number")
        print(f"   - All registry entries have basic_Oxygen morph_id")
    
        return oxygen_id, relation_id, attribute_ids

    def test_7_morph_creation_by_copying(self, setup_test_environment):
        """Test 7: Create new morph by copying all properties from static morph"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First run test 6 to get the Oxygen node with basic morph
        oxygen_id, relation_id, attribute_ids = self.test_6_basic_morph_creation(setup_test_environment)
        
        # Create new morph: oxide_ion by copying all properties from basic morph
        morph_data = {
            "node_id": oxygen_id,
            "name": "oxide_ion",
            "copy_from_morph": "basic_Oxygen"  # Copy all properties from basic morph
        }
        
        # Use the morph creation endpoint (we'll need to implement this)
        morph_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/morph/create",
            json=morph_data
        )
        
        if morph_response.status_code != 200:
            print(f"Morph creation failed:")
            print(f"Status: {morph_response.status_code}")
            print(f"Response: {morph_response.text}")
        
        assert morph_response.status_code == 200
        morph_result = morph_response.json()
        
        # Verify the new morph was created in the node
        node_file_path = Path(f"graph_data/users/{user_id}/nodes/{oxygen_id}.json")
        assert node_file_path.exists()
        
        with open(node_file_path, 'r') as f:
            node_content = json.load(f)
        
        # Should have both basic_Oxygen and oxide_ion morphs
        morphs = node_content.get("morphs", [])
        basic_morph = None
        oxide_morph = None
        
        for morph in morphs:
            if morph.get("morph_id") == "basic_Oxygen":
                basic_morph = morph
            elif morph.get("morph_id") == "oxide_ion":
                oxide_morph = morph
        
        assert basic_morph is not None, "Basic morph should exist"
        assert oxide_morph is not None, "Oxide ion morph should be created"
        
        # Verify oxide_ion morph has all the same relations and attributes as basic
        assert relation_id in oxide_morph.get("relationNode_ids", []), "Relation should be copied to oxide_ion morph"
        
        for attr_id in attribute_ids:
            assert attr_id in oxide_morph.get("attributeNode_ids", []), f"Attribute {attr_id} should be copied to oxide_ion morph"
        
        # Verify registry entries now show both morph_ids for the same relations/attributes
        relation_registry_path = Path(f"graph_data/users/{user_id}/relation_registry.json")
        assert relation_registry_path.exists()
        
        with open(relation_registry_path, 'r') as f:
            relation_registry = json.load(f)
        
        # The relation should now be associated with both morphs
        assert relation_id in relation_registry
        relation_entry = relation_registry[relation_id]
        
        # Check if the registry supports multiple morph_ids (list) or just the latest one
        if isinstance(relation_entry.get("morph_id"), list):
            assert "basic_Oxygen" in relation_entry["morph_id"]
            assert "oxide_ion" in relation_entry["morph_id"]
        else:
            # If it's a single value, it should be the latest one (oxide_ion)
            assert relation_entry["morph_id"] == "oxide_ion"
        
        # Verify attribute registry entries
        attribute_registry_path = Path(f"graph_data/users/{user_id}/attribute_registry.json")
        assert attribute_registry_path.exists()
        
        with open(attribute_registry_path, 'r') as f:
            attribute_registry = json.load(f)
        
        for attr_id in attribute_ids:
            assert attr_id in attribute_registry
            attr_entry = attribute_registry[attr_id]
            
            if isinstance(attr_entry.get("morph_id"), list):
                assert "basic_Oxygen" in attr_entry["morph_id"]
                assert "oxide_ion" in attr_entry["morph_id"]
            else:
                assert attr_entry["morph_id"] == "oxide_ion"
        
        print(f"✅ Morph creation by copying verified:")
        print(f"   - New morph 'oxide_ion' created")
        print(f"   - All relations and attributes copied from basic_Oxygen")
        print(f"   - Registry entries updated with oxide_ion morph_id")
        print(f"   - Node structure contains both morphs")
        
        return oxygen_id, relation_id, attribute_ids, "oxide_ion"

    def test_8_morph_operations(self, setup_test_environment):
        """Test 8: Test morph operations (move, copy, unlist) on oxide_ion morph"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First run test 7 to get the Oxygen node with both static and oxide_ion morphs
        oxygen_id, relation_id, attribute_ids, oxide_morph_id = self.test_7_morph_creation_by_copying(setup_test_environment)
        
        # Test 8.1: Move an attribute from static morph to oxide_ion morph
        move_attr_data = {
            "from_morph_id": "basic_Oxygen",
            "to_morph_id": oxide_morph_id
        }
        
        move_attr_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/attribute/move_to_morph/{oxygen_id}/atomic%20number",
            json=move_attr_data
        )
        
        if move_attr_response.status_code != 200:
            print(f"Move attribute failed:")
            print(f"Status: {move_attr_response.status_code}")
            print(f"Response: {move_attr_response.text}")
        
        assert move_attr_response.status_code == 200
        move_attr_result = move_attr_response.json()
        print(f"✅ Moved 'atomic number' attribute from basic_Oxygen to {oxide_morph_id}")
        
        # Test 8.2: Copy a relation to oxide_ion morph (should keep it in static too)
        copy_rel_data = {
            "morph_id": oxide_morph_id
        }
        
        copy_rel_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/relation/copy_to_morph/{oxygen_id}/is_a",
            json=copy_rel_data
        )
        
        if copy_rel_response.status_code != 200:
            print(f"Copy relation failed:")
            print(f"Status: {copy_rel_response.status_code}")
            print(f"Response: {copy_rel_response.text}")
        
        assert copy_rel_response.status_code == 200
        copy_rel_result = copy_rel_response.json()
        print(f"✅ Copied 'is_a' relation to {oxide_morph_id}")
        
        # Test 8.3: Unlist an attribute from oxide_ion morph
        unlist_attr_data = {
            "morph_id": oxide_morph_id
        }
        
        unlist_attr_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/attribute/unlist_from_morph/{oxygen_id}/proton%20number",
            json=unlist_attr_data
        )
        
        if unlist_attr_response.status_code != 200:
            print(f"Unlist attribute failed:")
            print(f"Status: {unlist_attr_response.status_code}")
            print(f"Response: {unlist_attr_response.text}")
        
        assert unlist_attr_response.status_code == 200
        unlist_attr_result = unlist_attr_response.json()
        print(f"✅ Unlisted 'proton number' attribute from {oxide_morph_id}")
        
        # Test 8.4: Unlist a relation from oxide_ion morph
        unlist_rel_data = {
            "morph_id": oxide_morph_id
        }
        
        unlist_rel_response = client.post(
            f"/api/ndf/users/{user_id}/graphs/{graph_id}/relation/unlist_from_morph/{oxygen_id}/is_a",
            json=unlist_rel_data
        )
        
        if unlist_rel_response.status_code != 200:
            print(f"Unlist relation failed:")
            print(f"Status: {unlist_rel_response.status_code}")
            print(f"Response: {unlist_rel_response.text}")
        
        assert unlist_rel_response.status_code == 200
        unlist_rel_result = unlist_rel_response.json()
        print(f"✅ Unlisted 'is_a' relation from {oxide_morph_id}")
        
        # Test 8.5: Verify the final state by listing attributes and relations by morph
        attr_list_response = client.get(f"/api/ndf/users/{user_id}/graphs/{graph_id}/attribute/list_by_morph/{oxygen_id}")
        assert attr_list_response.status_code == 200
        attr_list_result = attr_list_response.json()
        
        rel_list_response = client.get(f"/api/ndf/users/{user_id}/graphs/{graph_id}/relation/list_by_morph/{oxygen_id}")
        assert rel_list_response.status_code == 200
        rel_list_result = rel_list_response.json()
        
        # Verify the morph operations worked correctly
        basic_morph_attrs = attr_list_result["morphs"]["basic_Oxygen"]["attributes"]
        basic_morph_rels = rel_list_result["morphs"]["basic_Oxygen"]["relations"]
        oxide_morph_attrs = attr_list_result["morphs"][oxide_morph_id]["attributes"]
        oxide_morph_rels = rel_list_result["morphs"][oxide_morph_id]["relations"]
        
        # After operations:
        # - atomic number should be moved to oxide_ion (not in basic)
        # - proton number should be unlisted from oxide (still in basic)
        # - is_a relation should be unlisted from oxide (still in basic)
        
        attr_names_basic = [attr["name"] for attr in basic_morph_attrs]
        attr_names_oxide = [attr["name"] for attr in oxide_morph_attrs]
        rel_names_basic = [rel["name"] for rel in basic_morph_rels]
        rel_names_oxide = [rel["name"] for rel in oxide_morph_rels]
        
        # Verify atomic number was moved (not in basic, in oxide)
        assert "atomic number" not in attr_names_basic, "atomic number should be moved out of basic morph"
        assert "atomic number" in attr_names_oxide, "atomic number should be in oxide_ion morph"
        
        # Verify proton number was unlisted from oxide (still in basic)
        assert "proton number" in attr_names_basic, "proton number should still be in basic morph"
        assert "proton number" not in attr_names_oxide, "proton number should be unlisted from oxide_ion morph"
        
        # Verify is_a relation was unlisted from oxide (still in basic)
        assert "is_a" in rel_names_basic, "is_a relation should still be in basic morph"
        assert "is_a" not in rel_names_oxide, "is_a relation should be unlisted from oxide_ion morph"
        
        # Verify other attributes are still in basic morph
        assert "electron number" in attr_names_basic, "electron number should still be in basic morph"
        assert "neutron number" in attr_names_basic, "neutron number should still be in basic morph"
        
        print(f"✅ Morph operations verified:")
        print(f"   - atomic number moved from basic to {oxide_morph_id}")
        print(f"   - proton number unlisted from {oxide_morph_id} (still in basic)")
        print(f"   - is_a relation unlisted from {oxide_morph_id} (still in basic)")
        print(f"   - Other attributes remain in basic morph")
        print(f"   - Registry-driven morph management working correctly")
        
        return oxygen_id, relation_id, attribute_ids, oxide_morph_id

    def test_9_morph_context_property_creation(self, setup_test_environment):
        """Test 9: Create relations/attributes in morph context when they already exist"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First run test 7 to get the Oxygen node with both static and oxide_ion morphs
        oxygen_id, relation_id, attribute_ids, oxide_morph_id = self.test_7_morph_creation_by_copying(setup_test_environment)
        
        # Test 9.1: Try to create the same relation "oxygen is_a element" in oxide_ion context
        # This should NOT fail, but should ensure oxide_ion morph_id is associated
        relation_data = {
            "name": "is_a",
            "source_id": oxygen_id,
            "target_id": "element",
            "morph_id": oxide_morph_id  # Explicitly set morph context
        }
        
        response = client.post(f"/users/{user_id}/graphs/{graph_id}/relations", json=relation_data)
        print(f"9.1 Create existing relation in oxide_ion context: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Should succeed (not fail) and return the existing relation
        assert response.status_code == 200
        result = response.json()
        assert "relation_id" in result
        
        # Verify the relation registry now includes oxide_ion morph_id
        import json
        from pathlib import Path
        
        reg_path = Path(f"graph_data/users/{user_id}/relation_registry.json")
        registry = json.loads(reg_path.read_text())
        relation_reg_entry = registry.get(result["relation_id"])
        assert relation_reg_entry is not None
        
        # Check morph_id association - should include both basic_Oxygen and oxide_ion
        morph_ids = relation_reg_entry.get("morph_id", [])
        if isinstance(morph_ids, str):
            morph_ids = [morph_ids]
        assert "basic_Oxygen" in morph_ids
        assert oxide_morph_id in morph_ids
        
        print(f"✓ Relation registry morph_ids: {morph_ids}")
        
        # Test 9.2: Try to create the same attribute "atomic_number" in oxide_ion context
        # This should NOT fail, but should ensure oxide_ion morph_id is associated
        attribute_data = {
            "name": "atomic_number",
            "source_id": oxygen_id,
            "value": 8,
            "morph_id": oxide_morph_id  # Explicitly set morph context
        }
        
        response = client.post(f"/users/{user_id}/graphs/{graph_id}/attributes", json=attribute_data)
        print(f"9.2 Create existing attribute in oxide_ion context: {response.status_code}")
        print(f"Response: {response.json()}")
        
        # Should succeed (not fail) and return the existing attribute
        assert response.status_code == 200
        result = response.json()
        assert "attribute_id" in result
        
        # Verify the attribute registry now includes oxide_ion morph_id
        reg_path = Path(f"graph_data/users/{user_id}/attribute_registry.json")
        registry = json.loads(reg_path.read_text())
        attribute_reg_entry = registry.get(result["attribute_id"])
        assert attribute_reg_entry is not None
        
        # Check morph_id association - should include both basic_Oxygen and oxide_ion
        morph_ids = attribute_reg_entry.get("morph_id", [])
        if isinstance(morph_ids, str):
            morph_ids = [morph_ids]
        assert "basic_Oxygen" in morph_ids
        assert oxide_morph_id in morph_ids
        
        print(f"✓ Attribute registry morph_ids: {morph_ids}")
        
        # Test 9.3: Verify the node structure shows both morphs have access to these properties
        response = client.get(f"/users/{user_id}/graphs/{graph_id}/nodes/{oxygen_id}")
        assert response.status_code == 200
        node_data = response.json()
        
        # Check that both morphs exist and have the properties
        morphs = node_data.get("morphs", [])
        basic_morph = next((m for m in morphs if m["morph_id"] == "basic_Oxygen"), None)
        oxide_morph = next((m for m in morphs if m["morph_id"] == oxide_morph_id), None)
        
        assert basic_morph is not None
        assert oxide_morph is not None
        
        # Both morphs should have the same relation and attribute IDs
        assert basic_morph.get("relationNode_ids") == oxide_morph.get("relationNode_ids")
        assert basic_morph.get("attributeNode_ids") == oxide_morph.get("attributeNode_ids")
        
        print(f"✓ Both morphs share the same properties")
        print(f"✓ Basic morph relationNode_ids: {basic_morph.get('relationNode_ids')}")
        print(f"✓ Oxide morph relationNode_ids: {oxide_morph.get('relationNode_ids')}")
        print(f"✓ Basic morph attributeNode_ids: {basic_morph.get('attributeNode_ids')}")
        print(f"✓ Oxide morph attributeNode_ids: {oxide_morph.get('attributeNode_ids')}")
        
        return oxygen_id, relation_id, attribute_ids, oxide_morph_id 

    def test_10_morph_creation_scenarios(self, setup_test_environment):
        """Test 10: Test different morph creation scenarios"""
        user_id, graph_id = setup_test_environment
        
        from fastapi.testclient import TestClient
        from main import app
        
        client = TestClient(app)
        
        # First run test 7 to get the Oxygen node with both static and oxide_ion morphs
        oxygen_id, relation_id, attribute_ids, oxide_morph_id = self.test_7_morph_creation_by_copying(setup_test_environment)
        
        # Test 10a: Verify we can switch between morphs (set active morph)
        # First, check current active morph
        node_response = client.get(f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes/{oxygen_id}")
        assert node_response.status_code == 200
        node_data = node_response.json()
        current_nbh = node_data.get("nbh")
        print(f"Current active morph (nbh): {current_nbh}")
        
        # Switch to oxide_ion morph
        set_nbh_response = client.put(f"/api/ndf/users/{user_id}/graphs/{graph_id}/set_nbh/{oxygen_id}?nbh={oxide_morph_id}")
        assert set_nbh_response.status_code == 200
        nbh_result = set_nbh_response.json()
        assert nbh_result["active_morph"] == oxide_morph_id
        assert oxide_morph_id in nbh_result["available_morphs"]
        
        # Verify the node now shows oxide_ion as active
        node_response = client.get(f"/api/ndf/users/{user_id}/graphs/{graph_id}/nodes/{oxygen_id}")
        assert node_response.status_code == 200
        node_data = node_response.json()
        assert node_data.get("nbh") == oxide_morph_id
        
        # Test 10b: Switch back to static morph
        set_nbh_response = client.put(f"/api/ndf/users/{user_id}/graphs/{graph_id}/set_nbh/{oxygen_id}?nbh=basic_Oxygen")
        assert set_nbh_response.status_code == 200
        nbh_result = set_nbh_response.json()
        assert nbh_result["active_morph"] == "basic_Oxygen"
        
        # Test 10c: Verify registry contains both morph_ids for the relation
        relation_registry_path = Path(f"graph_data/users/{user_id}/relation_registry.json")
        assert relation_registry_path.exists()
        
        with open(relation_registry_path, 'r') as f:
            relation_registry = json.load(f)
        
        assert relation_id in relation_registry
        relation_entry = relation_registry[relation_id]
        morph_ids = relation_entry.get("morph_id", [])
        
        # Ensure morph_id is a list and contains both morphs
        assert isinstance(morph_ids, list)
        assert "basic_Oxygen" in morph_ids
        assert oxide_morph_id in morph_ids
        
        print(f"✅ Morph switching verified:")
        print(f"   - Can switch between basic_Oxygen and {oxide_morph_id}")
        print(f"   - Registry correctly tracks both morph_ids: {morph_ids}")
        
        return oxygen_id, relation_id, attribute_ids, oxide_morph_id 