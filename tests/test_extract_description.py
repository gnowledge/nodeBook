import pytest
from backend.routes.parse_pipeline import extract_description

def test_extract_description():
    # Description with CNL block at end
    section = "This is a node description.\n:::cnl\nhas color: blue\n:::"
    assert extract_description(section) == "This is a node description."
    # Description with CNL block at start
    section2 = ":::cnl\nhas color: blue\n:::\nThis is a node description."
    assert extract_description(section2) == "This is a node description."
    # Description with CNL block in the middle
    section3 = "Intro text.\n:::cnl\nhas color: blue\n:::\nMore text."
    assert extract_description(section3) == "Intro text.\nMore text."
    # No CNL block
    section4 = "Just a description."
    assert extract_description(section4) == "Just a description."
    # Only CNL block
    section5 = ":::cnl\nhas color: blue\n:::"
    assert extract_description(section5) == ""
    # Multiple CNL blocks
    section6 = "Desc1.\n:::cnl\nfoo\n:::\nDesc2.\n:::cnl\nbar\n:::\nDesc3."
    assert extract_description(section6) == "Desc1.\nDesc2.\nDesc3."
