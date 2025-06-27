import pytest
from routes.parse_pipeline import extract_node_name_as_is, extract_base_name

def extract_qualifier(node_name: str) -> str:
    """Extracts the qualifier (bold text) from a node name, if present."""
    import re
    match = re.search(r'\*\*([^*]+)\*\*', node_name)
    return match.group(1).strip() if match else ''

def test_extract_qualifier():
    assert extract_qualifier('**Big** *Red* Apple') == 'Big'
    assert extract_qualifier('*A* **B** C') == 'B'
    assert extract_qualifier('++Fast++ [likely] Car') == ''
    assert extract_qualifier('Plain Node') == ''
    assert extract_qualifier('**BoldOnly**') == 'BoldOnly'
    assert extract_qualifier('') == ''
