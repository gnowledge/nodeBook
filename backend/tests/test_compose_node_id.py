import pytest
from routes.parse_pipeline import extract_node_name_as_is, extract_base_name, extract_qualifier, extract_quantifier

def compose_node_id(quantifier: str, qualifier: str, base_name: str) -> str:
    """Compose a node id as quantifier_qualifier_base_name, skipping empty parts and joining with underscores. base_name is mandatory."""
    if not base_name:
        raise ValueError("base_name (noun) is mandatory for node_id composition.")
    parts = [quantifier, qualifier, base_name]
    node_id = '_'.join([p for p in parts if p])
    return node_id

def test_compose_node_id():
    assert compose_node_id('some', 'big', 'apple') == 'some_big_apple'
    assert compose_node_id('', 'big', 'apple') == 'big_apple'
    assert compose_node_id('some', '', 'apple') == 'some_apple'
    assert compose_node_id('', '', 'apple') == 'apple'
    with pytest.raises(ValueError):
        compose_node_id('', '', '')
    with pytest.raises(ValueError):
        compose_node_id('a', 'b', '')
