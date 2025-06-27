import pytest
from routes.parse_pipeline import extract_node_name_as_is
import re

def extract_base_name(node_name: str) -> str:
    """Extracts the base name from a node name by removing all markdown markup (bold, italics, underline, modality, etc)."""
    # Remove bold (**text**), italics (*text*), underline (++text++), and [modality]
    s = re.sub(r'\*\*[^*]+\*\*', '', node_name)  # remove bold
    s = re.sub(r'\*[^*]+\*', '', s)               # remove italics
    s = re.sub(r'\+\+[^+]+\+\+', '', s)         # remove underline
    s = re.sub(r'\[[^\]]+\]', '', s)             # remove [modality]
    return s.strip()

def test_extract_base_name():
    assert extract_base_name('**Big** *Red* Apple') == 'Apple'
    assert extract_base_name('*A* **B** C') == 'C'
    assert extract_base_name('++Fast++ [likely] Car') == 'Car'
    assert extract_base_name('Plain Node') == 'Plain Node'
    assert extract_base_name('**BoldOnly**') == ''
    assert extract_base_name('') == ''
