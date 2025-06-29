"""
NDF Studio Node Utilities

This module provides utility functions for parsing and manipulating node names
in the NDF Studio backend. These utilities handle markdown formatting, text extraction,
and node ID composition.

Functions:
    extract_node_name_as_is: Extract node name from markdown heading
    extract_base_name: Extract base name by removing markdown markup
    extract_qualifier: Extract qualifier (bold text) from node name
    extract_quantifier: Extract quantifier (italics text) from node name
    compose_node_id: Compose node ID from components
"""

import re
from typing import List, Dict, Any, Optional

def extract_node_name_as_is(heading: str) -> str:
    """
    Extract the node name as-is from a markdown heading.
    
    This function removes the leading '#' characters and any surrounding whitespace
    from a markdown heading to extract the clean node name.
    
    Args:
        heading (str): Markdown heading string (e.g., "# Node Name" or "### Node Name")
        
    Returns:
        str: Clean node name without markdown heading markers
        
    Example:
        >>> extract_node_name_as_is("# My Node")
        'My Node'
        >>> extract_node_name_as_is("### **Bold** Node")
        '**Bold** Node'
        >>> extract_node_name_as_is("  #   Node with spaces   ")
        'Node with spaces'
    """
    return heading.lstrip('#').strip()

def extract_base_name(node_name: str) -> str:
    """
    Extract the base name from a node name by removing all markdown markup.
    
    This function removes various markdown formatting elements including:
    - Bold text (**text**)
    - Italic text (*text*)
    - Underlined text (++text++)
    - Modality brackets ([modality])
    
    Args:
        node_name (str): Node name that may contain markdown formatting
        
    Returns:
        str: Base name with all markdown markup removed
        
    Example:
        >>> extract_base_name("**Bold** *italic* base_name")
        'base_name'
        >>> extract_base_name("++Underlined++ [possibly] **important** node")
        'node'
        >>> extract_base_name("simple_node_name")
        'simple_node_name'
    """
    s = re.sub(r'\*\*[^*]+\*\*', '', node_name)  # remove bold
    s = re.sub(r'\*[^*]+\*', '', s)               # remove italics
    s = re.sub(r'\+\+[^+]+\+\+', '', s)         # remove underline
    s = re.sub(r'\[[^\]]+\]', '', s)             # remove [modality]
    return s.strip()

def extract_qualifier(node_name: str) -> str:
    """
    Extract the qualifier (bold text) from a node name, if present.
    
    This function looks for text wrapped in double asterisks (**text**)
    and extracts it as the qualifier.
    
    Args:
        node_name (str): Node name that may contain bold qualifier text
        
    Returns:
        str: Qualifier text if found, empty string otherwise
        
    Example:
        >>> extract_qualifier("**Important** node")
        'Important'
        >>> extract_node_name_as_is("**Bold** *italic* node")
        'Bold'
        >>> extract_qualifier("node without qualifier")
        ''
    """
    match = re.search(r'\*\*([^*]+)\*\*', node_name)
    return match.group(1).strip() if match else ''

def extract_quantifier(node_name: str) -> str:
    """
    Extract the quantifier (italics text, not bold) from a node name, if present.
    
    This function looks for text wrapped in single asterisks (*text*) that is not
    part of bold formatting (**text**). It returns the first such match.
    
    Args:
        node_name (str): Node name that may contain italic quantifier text
        
    Returns:
        str: Quantifier text if found, empty string otherwise
        
    Example:
        >>> extract_quantifier("*some* node")
        'some'
        >>> extract_quantifier("**Bold** *italic* node")
        'italic'
        >>> extract_quantifier("node without quantifier")
        ''
    """
    matches = re.findall(r'(?<!\*)\*([^*]+)\*(?!\*)', node_name)
    return matches[0].strip() if matches else ''

def compose_node_id(quantifier: str, qualifier: str, base_name: str, report: Optional[List[Dict[str, Any]]] = None) -> Optional[str]:
    """
    Compose a node ID from quantifier, qualifier, and base name components.
    
    This function combines the three components into a single node ID by:
    1. Filtering out empty components
    2. Joining the remaining components with underscores
    3. Validating that base_name is provided (mandatory)
    
    Args:
        quantifier (str): Quantifier component (e.g., "some", "all")
        qualifier (str): Qualifier component (e.g., "important", "special")
        base_name (str): Base name component (mandatory)
        report (Optional[List[Dict[str, Any]]]): Optional list to collect error reports
        
    Returns:
        Optional[str]: Composed node ID, or None if base_name is missing
        
    Example:
        >>> compose_node_id("some", "important", "node")
        'some_important_node'
        >>> compose_node_id("", "special", "entity")
        'special_entity'
        >>> compose_node_id("", "", "base")
        'base'
        >>> compose_node_id("", "", "")
        None
        
    Note:
        If base_name is empty and a report list is provided, an error message
        will be appended to the report and None will be returned.
    """
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
