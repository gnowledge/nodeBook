"""
Test cases for NDF Studio Core Utilities

This module contains comprehensive test cases for the utility functions
in backend.core.utils module, aiming for high test coverage.
"""

import pytest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, mock_open
from backend.core.utils import (
    render_description_md,
    normalize_id,
    save_json_file,
    load_json_file,
    load_text_file
)


class TestRenderDescriptionMd:
    """Test cases for render_description_md function."""
    
    def test_basic_markdown_conversion(self):
        """Test basic markdown to HTML conversion."""
        text = "**Bold text** and *italic text*"
        result = render_description_md(text)
        assert "<strong>Bold text</strong>" in result
        assert "<em>italic text</em>" in result
        
    def test_links_conversion(self):
        """Test markdown links are converted to HTML."""
        text = "[Link text](http://example.com)"
        result = render_description_md(text)
        assert '<a href="http://example.com">Link text</a>' in result
        
    def test_lists_conversion(self):
        """Test markdown lists are converted to HTML."""
        text = "- Item 1\n- Item 2"
        result = render_description_md(text)
        assert "<ul>" in result
        assert "<li>Item 1</li>" in result
        assert "<li>Item 2</li>" in result
        
    def test_code_blocks(self):
        """Test markdown code blocks are converted to HTML."""
        text = "```python\nprint('hello')\n```"
        result = render_description_md(text)
        assert "<code>" in result
        assert "python" in result
        assert "print('hello')" in result
        
    def test_inline_code(self):
        """Test inline code is converted to HTML."""
        text = "Use `print()` function"
        result = render_description_md(text)
        assert "<code>print()</code>" in result
        
    def test_blockquotes(self):
        """Test blockquotes are converted to HTML."""
        text = "> This is a quote"
        result = render_description_md(text)
        assert "<blockquote>" in result
        
    def test_empty_input(self):
        """Test handling of empty or None input."""
        result = render_description_md("")
        assert result == ""
        
        # The function handles None by converting it to empty string
        result = render_description_md(None)
        assert result == ""
        
    def test_xss_prevention(self):
        """Test that XSS attacks are prevented."""
        malicious_text = "<script>alert('xss')</script>"
        result = render_description_md(malicious_text)
        assert "<script>" not in result
        assert "&lt;script&gt;" in result or "alert('xss')" not in result
        
    def test_allowed_tags_preserved(self):
        """Test that allowed tags are preserved."""
        text = "<p>Paragraph</p><b>Bold</b><i>Italic</i>"
        result = render_description_md(text)
        assert "<p>Paragraph</p>" in result
        assert "<b>Bold</b>" in result
        assert "<i>Italic</i>" in result


class TestNormalizeId:
    """Test cases for normalize_id function."""
    
    def test_basic_normalization(self):
        """Test basic string normalization."""
        result = normalize_id("My Node Name")
        assert result == "my_node_name"
        
    def test_with_whitespace(self):
        """Test normalization with extra whitespace."""
        result = normalize_id("  My Node Name  ")
        assert result == "my_node_name"
        
    def test_multiple_spaces(self):
        """Test normalization with multiple spaces."""
        result = normalize_id("My   Node   Name")
        assert result == "my___node___name"
        
    def test_special_characters(self):
        """Test normalization with special characters."""
        result = normalize_id("My-Node@Name!")
        assert result == "my-node@name!"
        
    def test_empty_string(self):
        """Test normalization of empty string."""
        result = normalize_id("")
        assert result == ""
        
    def test_single_word(self):
        """Test normalization of single word."""
        result = normalize_id("Node")
        assert result == "node"
        
    def test_numbers(self):
        """Test normalization with numbers."""
        result = normalize_id("Node 123")
        assert result == "node_123"


class TestSaveJsonFile:
    """Test cases for save_json_file function."""
    
    def test_save_basic_data(self):
        """Test saving basic JSON data."""
        data = {"key": "value", "number": 42, "boolean": True}
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
            
        try:
            save_json_file(tmp_path, data)
            
            # Verify the file was created and contains correct data
            with open(tmp_path, 'r') as f:
                saved_data = json.load(f)
                
            assert saved_data == data
            assert saved_data["key"] == "value"
            assert saved_data["number"] == 42
            assert saved_data["boolean"] is True
            
        finally:
            tmp_path.unlink()
            
    def test_save_nested_data(self):
        """Test saving nested JSON data."""
        data = {
            "user": {
                "name": "John",
                "settings": {
                    "theme": "dark",
                    "notifications": True
                }
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
            
        try:
            save_json_file(tmp_path, data)
            
            with open(tmp_path, 'r') as f:
                saved_data = json.load(f)
                
            assert saved_data == data
            assert saved_data["user"]["name"] == "John"
            assert saved_data["user"]["settings"]["theme"] == "dark"
            
        finally:
            tmp_path.unlink()
            
    def test_save_empty_dict(self):
        """Test saving empty dictionary."""
        data = {}
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
            
        try:
            save_json_file(tmp_path, data)
            
            with open(tmp_path, 'r') as f:
                saved_data = json.load(f)
                
            assert saved_data == {}
            
        finally:
            tmp_path.unlink()
            
    def test_save_with_unicode(self):
        """Test saving data with unicode characters."""
        data = {"message": "Hello 世界", "emoji": "🚀"}
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
            
        try:
            save_json_file(tmp_path, data)
            
            with open(tmp_path, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
                
            assert saved_data == data
            assert saved_data["message"] == "Hello 世界"
            assert saved_data["emoji"] == "🚀"
            
        finally:
            tmp_path.unlink()
            
    def test_save_permission_error(self):
        """Test handling of permission errors."""
        data = {"key": "value"}
        
        with patch('builtins.open', side_effect=PermissionError("Permission denied")):
            with pytest.raises(PermissionError):
                save_json_file(Path("/root/test.json"), data)


class TestLoadJsonFile:
    """Test cases for load_json_file function."""
    
    def test_load_basic_data(self):
        """Test loading basic JSON data."""
        data = {"key": "value", "number": 42}
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            json.dump(data, tmp_file)
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_data = load_json_file(tmp_path)
            assert loaded_data == data
            assert loaded_data["key"] == "value"
            assert loaded_data["number"] == 42
            
        finally:
            tmp_path.unlink()
            
    def test_load_nested_data(self):
        """Test loading nested JSON data."""
        data = {
            "user": {
                "name": "John",
                "settings": {"theme": "dark"}
            }
        }
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            json.dump(data, tmp_file)
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_data = load_json_file(tmp_path)
            assert loaded_data == data
            assert loaded_data["user"]["name"] == "John"
            
        finally:
            tmp_path.unlink()
            
    def test_load_empty_file(self):
        """Test loading empty JSON file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_file.write("{}")
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_data = load_json_file(tmp_path)
            assert loaded_data == {}
            
        finally:
            tmp_path.unlink()
            
    def test_load_file_not_found(self):
        """Test handling of file not found error."""
        with pytest.raises(FileNotFoundError):
            load_json_file(Path("nonexistent.json"))
            
    def test_load_invalid_json(self):
        """Test handling of invalid JSON."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            tmp_file.write("{invalid json}")
            tmp_path = Path(tmp_file.name)
            
        try:
            with pytest.raises(json.JSONDecodeError):
                load_json_file(tmp_path)
        finally:
            tmp_path.unlink()
            
    def test_load_with_unicode(self):
        """Test loading JSON with unicode characters."""
        data = {"message": "Hello 世界", "emoji": "🚀"}
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as tmp_file:
            json.dump(data, tmp_file, ensure_ascii=False)
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_data = load_json_file(tmp_path)
            assert loaded_data == data
            assert loaded_data["message"] == "Hello 世界"
            
        finally:
            tmp_path.unlink()


class TestLoadTextFile:
    """Test cases for load_text_file function."""
    
    def test_load_basic_text(self):
        """Test loading basic text file."""
        content = "Hello, World!\nThis is a test file."
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_content = load_text_file(tmp_path)
            assert loaded_content == content
            
        finally:
            tmp_path.unlink()
            
    def test_load_empty_file(self):
        """Test loading empty text file."""
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp_file:
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_content = load_text_file(tmp_path)
            assert loaded_content == ""
            
        finally:
            tmp_path.unlink()
            
    def test_load_with_unicode(self):
        """Test loading text file with unicode characters."""
        content = "Hello 世界! 🚀\nThis is a test with unicode."
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as tmp_file:
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_content = load_text_file(tmp_path)
            assert loaded_content == content
            assert "世界" in loaded_content
            assert "🚀" in loaded_content
            
        finally:
            tmp_path.unlink()
            
    def test_load_file_not_found(self):
        """Test handling of file not found error."""
        with pytest.raises(FileNotFoundError):
            load_text_file(Path("nonexistent.txt"))
            
    def test_load_large_file(self):
        """Test loading a large text file."""
        content = "Line " + "\nLine ".join(str(i) for i in range(1000))
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp_file:
            tmp_file.write(content)
            tmp_path = Path(tmp_file.name)
            
        try:
            loaded_content = load_text_file(tmp_path)
            assert loaded_content == content
            assert loaded_content.count("Line") == 1000
            
        finally:
            tmp_path.unlink()


if __name__ == "__main__":
    pytest.main([__file__]) 