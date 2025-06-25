import pytest
from backend.core.cnl_parser import extract_qualifier, extract_quantifier, extract_base, extract_adverb, parse_node_title

@pytest.mark.parametrize("text,expected", [
    ("**female** mathematician", ("female", "mathematician")),
    ("__ancient__ philosopher", ("ancient", "philosopher")),
    ("mathematician", (None, "mathematician")),
    ("**female**", ("female", "")),
])
def test_extract_qualifier(text, expected):
    assert extract_qualifier(text) == expected

@pytest.mark.parametrize("text,expected", [
    ("*all* mathematicians", ("all", "mathematicians")),
    ("*some* philosophers", ("some", "philosophers")),
    ("mathematicians", (None, "mathematicians")),
    ("*all*", ("all", "")),
])
def test_extract_quantifier(text, expected):
    assert extract_quantifier(text) == expected

@pytest.mark.parametrize("text,expected", [
    ("++quickly++ <competes_with>", ("quickly", "<competes_with>")),
    ("++rarely++ <visits> humans", ("rarely", "<visits> humans")),
    ("<causes> disease", (None, "<causes> disease")),
])
def test_extract_adverb(text, expected):
    assert extract_adverb(text) == expected

@pytest.mark.parametrize("text,expected", [
    ("**female** mathematician", "mathematician"),
    ("*all* mathematicians", "mathematicians"),
    ("*all* **female** mathematicians", "mathematicians"),
    ("mathematician", "mathematician"),
    ("*all*", ""),
    ("**female**", ""),
])
def test_extract_base(text, expected):
    assert extract_base(text) == expected

@pytest.mark.parametrize("title,expected", [
    ("*all* **female** mathematicians", dict(quantifier="all", qualifier="female", base="mathematicians")),
    ("**ancient** philosophers", dict(quantifier=None, qualifier="ancient", base="philosophers")),
    ("*some* philosophers", dict(quantifier="some", qualifier=None, base="philosophers")),
    ("mathematicians", dict(quantifier=None, qualifier=None, base="mathematicians")),
])
def test_parse_node_title(title, expected):
    result = parse_node_title(title)
    for k in expected:
        assert result[k] == expected[k]
