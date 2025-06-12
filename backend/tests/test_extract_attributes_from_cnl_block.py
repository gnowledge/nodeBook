import pytest
from backend.routes.parse_pipeline import extract_attributes_from_cnl_block

def test_extract_attributes_from_cnl_block():
    cnl = """
    has color: *blue* ++quick++ [likely]
    has size: large
    has weight: *10* ++fast++ [approx]
    has incomplete
    has : missingvalue
    has unitless: 42
    """
    node_id = 'test_node'
    report = []
    attrs = extract_attributes_from_cnl_block(cnl, node_id, report)
    assert len(attrs) == 4  # Only valid attributes
    assert attrs[0]['attribute_name'] == 'color'
    assert attrs[0]['value'] == ''
    assert attrs[0]['unit'] == 'blue'
    assert attrs[0]['adverb'] == 'quick'
    assert attrs[0]['modality'] == 'likely'
    assert attrs[0]['target_node'] == node_id
    assert attrs[1]['attribute_name'] == 'size'
    assert attrs[1]['value'] == 'large'
    assert attrs[1]['unit'] == ''
    assert attrs[2]['attribute_name'] == 'weight'
    assert attrs[2]['value'] == ''
    assert attrs[2]['unit'] == '10'
    assert attrs[2]['adverb'] == 'fast'
    assert attrs[2]['modality'] == 'approx'
    assert attrs[3]['attribute_name'] == 'unitless'
    assert attrs[3]['value'] == '42'
    assert attrs[3]['unit'] == ''
    # Check report for errors
    assert any('incomplete' in r['message'] for r in report)
    assert any('missingvalue' in r['message'] for r in report)
