import pytest
from routes.parse_pipeline import extract_cnl_block

def extract_node_name_as_is(heading: str) -> str:
    """Extracts the node name as-is from a markdown heading (removes leading # and whitespace)."""
    return heading.lstrip('#').strip()

def test_extract_node_name_as_is():
    assert extract_node_name_as_is('# Node 1') == 'Node 1'
    assert extract_node_name_as_is('## *A* **B** C') == '*A* **B** C'
    assert extract_node_name_as_is('###   Foo Bar  ') == 'Foo Bar'
    assert extract_node_name_as_is('#') == ''
    assert extract_node_name_as_is('####   ') == ''
