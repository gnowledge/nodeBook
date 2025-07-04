"""
NDF Studio Core Utilities

This module provides utility functions used throughout the NDF Studio backend.
These utilities handle common operations like file I/O, text processing, and data normalization.

Functions:
    render_description_md: Converts markdown text to safe HTML
    normalize_id: Normalizes strings to valid identifiers
    save_json_file: Saves data to JSON file
    load_json_file: Loads data from JSON file
    load_text_file: Loads text content from file
"""

import markdown
import bleach
from pathlib import Path
import json
from typing import Dict, Any, Optional

def render_description_md(text: Optional[str]) -> str:
    """
    Converts markdown text to safe HTML for display.
    
    This function takes markdown text and converts it to HTML, then sanitizes
    the HTML to prevent XSS attacks by allowing only safe tags and attributes.
    
    Args:
        text (Optional[str]): Markdown text to convert and sanitize
        
    Returns:
        str: Safe HTML string ready for display
        
    Example:
        >>> render_description_md("**Bold text** and [link](http://example.com)")
        '<p><strong>Bold text</strong> and <a href="http://example.com">link</a></p>'
    """
    raw_html = markdown.markdown(text or "")
    safe_html = bleach.clean(
        raw_html,
        tags=["p", "b", "i", "strong", "em", "ul", "ol", "li", "a", "code", "pre", "blockquote"],
        attributes={"a": ["href"]},
    )
    return safe_html

def normalize_id(name: str) -> str:
    """
    Normalizes a string to create a valid identifier.
    
    This function converts a string to a valid identifier by:
    - Trimming whitespace
    - Preserving case (to avoid conflicts between 'Water' and 'water')
    - Replacing spaces with underscores
    
    Args:
        name (str): The string to normalize
        
    Returns:
        str: Normalized identifier string
        
    Example:
        >>> normalize_id("  My Node Name  ")
        'My_Node_Name'
        >>> normalize_id("  Water  ")
        'Water'
        >>> normalize_id("  water  ")
        'water'
    """
    return name.strip().replace(" ", "_")

def save_json_file(path: Path, data: Dict[str, Any]) -> None:
    """
    Saves data to a JSON file with proper formatting.
    
    This function saves a dictionary to a JSON file with UTF-8 encoding
    and pretty formatting (2-space indentation).
    
    Args:
        path (Path): Path to the JSON file to create/overwrite
        data (Dict[str, Any]): Dictionary data to save
        
    Raises:
        IOError: If the file cannot be written
        TypeError: If the data cannot be serialized to JSON
        
    Example:
        >>> save_json_file(Path("config.json"), {"key": "value"})
        # Creates config.json with: {"key": "value"}
    """
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_json_file(path: Path) -> Dict[str, Any]:
    """
    Loads data from a JSON file.
    
    This function reads a JSON file and returns the parsed dictionary.
    The file is expected to be UTF-8 encoded.
    
    Args:
        path (Path): Path to the JSON file to read
        
    Returns:
        Dict[str, Any]: Parsed JSON data as a dictionary
        
    Raises:
        FileNotFoundError: If the file doesn't exist
        json.JSONDecodeError: If the file contains invalid JSON
        IOError: If the file cannot be read
        
    Example:
        >>> data = load_json_file(Path("config.json"))
        >>> print(data)
        {'key': 'value'}
    """
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_text_file(path: Path) -> str:
    """
    Loads text content from a file.
    
    This function reads a text file and returns its content as a string.
    The file is expected to be UTF-8 encoded.
    
    Args:
        path (Path): Path to the text file to read
        
    Returns:
        str: Content of the text file
        
    Raises:
        FileNotFoundError: If the file doesn't exist
        IOError: If the file cannot be read
        
    Example:
        >>> content = load_text_file(Path("readme.md"))
        >>> print(content[:50])
        '# NDF Studio Documentation\n\nThis is the main...'
    """
    with path.open("r", encoding="utf-8") as f:
        return f.read()    
