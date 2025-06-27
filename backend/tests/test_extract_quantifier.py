import pytest
from routes.parse_pipeline import extract_node_name_as_is, extract_base_name, extract_qualifier

def extract_quantifier(node_name: str) -> str:
    """Extracts the quantifier (italics text, not bold) from a node name, if present."""
    import re
    # Match *text* that is NOT part of **text**
    matches = re.findall(r'(?<!\*)\*([^*]+)\*(?!\*)', node_name)
    return matches[0].strip() if matches else ''

def test_extract_quantifier():
    assert extract_quantifier('**Big** *Red* Apple') == 'Red'
    assert extract_quantifier('*A* **B** C') == 'A'
    assert extract_quantifier('++Fast++ [likely] Car') == ''
    assert extract_quantifier('Plain Node') == ''
    assert extract_quantifier('**BoldOnly**') == ''
    assert extract_quantifier('') == ''
