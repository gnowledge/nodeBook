import pytest
from routes.parse_pipeline import (
    extract_node_name_as_is, extract_base_name, extract_qualifier, extract_quantifier, compose_node_id,
    extract_relations_from_cnl_block
)

def test_extract_relations_from_cnl_block():
    cnl = """
    <parent_of> **Big** *Red* Apple
    <friend_of> *Small* **Green** Banana
    <related_to> Orange
    <parent_of> *Fast* ++quick++ [likely] Car
    incomplete_relation
    """
    source_node = 'source_id'
    report = []
    relations = extract_relations_from_cnl_block(cnl, source_node, report)
    assert len(relations) == 4
    assert relations[0]['relation_name'] == 'parent_of'
    assert relations[0]['source_node'] == source_node
    assert relations[0]['target_node_name'] == '**Big** *Red* Apple'
    assert relations[0]['target_base_name'] == 'Apple'
    assert relations[0]['target_qualifier'] == 'Big'
    assert relations[0]['target_quantifier'] == 'Red'
    assert relations[0]['target_node_id'] == 'Red_Big_Apple'
    assert relations[1]['relation_name'] == 'friend_of'
    assert relations[1]['target_base_name'] == 'Banana'
    assert relations[1]['target_qualifier'] == 'Green'
    assert relations[1]['target_quantifier'] == 'Small'
    assert relations[2]['relation_name'] == 'related_to'
    assert relations[2]['target_base_name'] == 'Orange'
    assert relations[2]['target_qualifier'] == ''
    assert relations[2]['target_quantifier'] == ''
    assert relations[3]['relation_name'] == 'parent_of'
    assert relations[3]['target_base_name'] == 'Car'
    assert relations[3]['target_qualifier'] == ''
    assert relations[3]['target_quantifier'] == 'Fast'
    # Check report for errors
    assert any('incomplete' in r['message'] for r in report)
