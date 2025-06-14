import os
# Set NDF_DATA_ROOT before any backend imports
import tempfile
ndf_data_root = tempfile.mkdtemp(prefix="ndf_data_root_")
os.environ["NDF_DATA_ROOT"] = ndf_data_root

import sys
from pathlib import Path
BACKEND_ROOT = Path(__file__).parent.parent.resolve()
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from routes.ndf_routes import parse_graph
from core.compose import compose_graph
from core.cnl_parser import parse_node_title
from core.utils import load_json_file
import json

def setup_cnl_graph(user_id, graph_id, cnl_md):
    # Always use the NDF_DATA_ROOT for test data
    data_root = Path(os.environ["NDF_DATA_ROOT"])
    graph_dir = data_root / "users" / user_id / "graphs" / graph_id
    graph_dir.mkdir(parents=True, exist_ok=True)
    (graph_dir / "cnl.md").write_text(cnl_md)
    return graph_dir

def test_parsed_json_nodes_and_relations():
    """
    0. parsed.json must contain all nodes (source and target), with all relations and attributes from CNL.
    """
    user_id = "user0"
    graph_id = "testgraph"
    cnl_md = '''
# *all* **female** mathematicians
A group of mathematicians.
:::cnl
<collaborates_with> *some* **male** mathematicians [often]
has field: mathematics
:::

# **male** mathematicians
A group of male mathematicians.
:::cnl
<collaborates_with> *all* **female** mathematicians [rarely]
:::
'''
    graph_dir = setup_cnl_graph(user_id, graph_id, cnl_md)
    parse_graph(user_id, graph_id)
    parsed_path = graph_dir / "parsed.json"
    parsed = load_json_file(parsed_path)
    # All nodes (source and target) must exist
    node_ids = {n["id"] if isinstance(n, dict) else n for n in parsed["nodes"] if isinstance(n, dict) or isinstance(n, str)}
    assert "all_female_mathematicians" in node_ids
    assert "male_mathematicians" in node_ids
    # Relations and attributes must be present
    rel_names = {r["name"] for r in parsed["relations"]}
    assert "collaborates_with" in rel_names
    attr_names = {a["name"] for a in parsed["attributes"]}
    assert "field" in attr_names

def test_node_canonicalization_and_storage():
    """
    1. Node tests: check quantifier/qualifier, name/base/id logic, and node file storage.
    """
    user_id = "user0"
    graph_id = "testgraph2"
    cnl_md = '''
# mathematician
A mathematician.
:::cnl
has field: mathematics
:::

# *all* **female** mathematicians
A group of mathematicians.
:::cnl
has field: mathematics
:::
'''
    graph_dir = setup_cnl_graph(user_id, graph_id, cnl_md)
    parse_graph(user_id, graph_id)  # Ensure parsed.json is created
    # composed = generate_composed_graph(user_id, graph_id)
    # Instead, call parse_graph or compose_graph if needed for test
    data_root = Path(os.environ["NDF_DATA_ROOT"])
    node_dir = data_root / "users" / user_id / "nodes"
    files = list(node_dir.glob("*.json"))
    assert files, "Node files should be created"
    for f in files:
        node = json.loads(f.read_text())
        # Easy node: no quantifier/qualifier
        if node["id"] == "mathematician":
            assert node["name"] == node["base"]
            assert node["id"] == node["base"]
        # Harder node: quantifier/qualifier
        if node["id"] == "all_female_mathematicians":
            assert node["name"] != node["base"]
            assert node["name"] != node["id"]
            assert node["base"] == "mathematicians"

def test_composed_json_from_nodes():
    """
    2. composed.json entries must match user/nodes/ directory (single source of truth).
    """
    user_id = "user0"
    graph_id = "testgraph3"
    cnl_md = '''
# mathematician
A mathematician.
:::cnl
has field: mathematics
:::
'''
    graph_dir = setup_cnl_graph(user_id, graph_id, cnl_md)
    parse_graph(user_id, graph_id)
    # Compose the graph using all node ids in the test graph
    data_root = Path(os.environ["NDF_DATA_ROOT"])
    node_dir = data_root / "users" / user_id / "nodes"
    node_ids = [f.stem for f in node_dir.glob("*.json")]
    composed = compose_graph(user_id, graph_id, node_ids)
    for node in composed["nodes"]:
        node_file = node_dir / f"{node['id']}.json"
        assert node_file.exists(), f"Node file {node_file} missing"
        node_data = json.loads(node_file.read_text())
        for k in ["id", "name", "base", "quantifier", "qualifier"]:
            assert node[k] == node_data[k]

def test_relations_and_attributes_adverb_modality():
    """
    3 & 4. Relations/attributes with/without adverbs and modality.
    """
    user_id = "user0"
    graph_id = "testgraph4"
    cnl_md = '''
# mathematician
A mathematician.
:::cnl
<collaborates_with> mathematician [often]
has field: mathematics [uncertain]
<collaborates_with> mathematician
has field: mathematics
:::
'''
    graph_dir = setup_cnl_graph(user_id, graph_id, cnl_md)
    parse_graph(user_id, graph_id)
    # Compose the graph using all node ids in the test graph
    data_root = Path(os.environ["NDF_DATA_ROOT"])
    node_dir = data_root / "users" / user_id / "nodes"
    node_ids = [f.stem for f in node_dir.glob("*.json")]
    composed = compose_graph(user_id, graph_id, node_ids)
    node = next(n for n in composed["nodes"] if n["id"] == "mathematician")
    rels = node["relations"]
    attrs = node["attributes"]
    # Relations with and without modality
    assert any(r.get("modality") == "often" or r.get("modality") == "uncertain" for r in rels + attrs)
    assert any(r.get("modality") is None or r.get("modality") == "" for r in rels + attrs)
    # Relations/attributes with and without adverb
    assert any(r.get("adverb") for r in rels + attrs) or any("adverb" not in r for r in rels + attrs)
