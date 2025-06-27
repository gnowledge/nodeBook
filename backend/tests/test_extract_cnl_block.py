import pytest
from routes.parse_pipeline import extract_sections

def extract_cnl_block(section_content: str) -> str:
    """Extracts the first :::cnl ... ::: block from section content, returns the inner text or empty string."""
    import re
    match = re.search(r':::cnl\s*(.*?)\s*:::', section_content, re.DOTALL)
    return match.group(1).strip() if match else ''

def test_extract_cnl_block():
    section = '# Node 1\nSome intro text\n:::cnl\nhas color: blue\nhas size: large\n:::\nMore text.'
    cnl = extract_cnl_block(section)
    assert 'has color: blue' in cnl
    assert 'has size: large' in cnl
    # No CNL block
    section2 = '# Node 2\nNo CNL block here.'
    assert extract_cnl_block(section2) == ''
    # CNL block with extra whitespace
    section3 = '# Node 3\n:::cnl\n   has foo: bar   \n:::'
    assert extract_cnl_block(section3) == 'has foo: bar'
