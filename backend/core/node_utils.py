import re
from typing import List, Dict, Any

def extract_node_name_as_is(heading: str) -> str:
    """Extracts the node name as-is from a markdown heading (removes leading # and whitespace)."""
    return heading.lstrip('#').strip()

def extract_base_name(node_name: str) -> str:
    """Extracts the base name from a node name by removing all markdown markup (bold, italics, underline, modality, etc)."""
    s = re.sub(r'\*\*[^*]+\*\*', '', node_name)  # remove bold
    s = re.sub(r'\*[^*]+\*', '', s)               # remove italics
    s = re.sub(r'\+\+[^+]+\+\+', '', s)         # remove underline
    s = re.sub(r'\[[^\]]+\]', '', s)             # remove [modality]
    return s.strip()

def extract_qualifier(node_name: str) -> str:
    """Extracts the qualifier (bold text) from a node name, if present."""
    match = re.search(r'\*\*([^*]+)\*\*', node_name)
    return match.group(1).strip() if match else ''

def extract_quantifier(node_name: str) -> str:
    """Extracts the quantifier (italics text, not bold) from a node name, if present."""
    matches = re.findall(r'(?<!\*)\*([^*]+)\*(?!\*)', node_name)
    return matches[0].strip() if matches else ''

def compose_node_id(quantifier: str, qualifier: str, base_name: str, report: list = None) -> str:
    """Compose a node id as quantifier_qualifier_base_name, skipping empty parts and joining with underscores. base_name is mandatory. If missing, append to report and return None."""
    if not base_name:
        if report is not None:
            report.append({
                'type': 'error',
                'stage': 'compose_node_id',
                'message': 'base_name (noun) is mandatory for node_id composition.',
                'quantifier': quantifier,
                'qualifier': qualifier
            })
        return None
    parts = [quantifier, qualifier, base_name]
    node_id = '_'.join([p for p in parts if p])
    return node_id
