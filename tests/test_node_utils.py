"""
Test cases for NDF Studio Node Utilities

This module contains comprehensive test cases for the node utility functions
in backend.core.node_utils module, aiming for high test coverage.
"""

import pytest
from backend.core.node_utils import (
    extract_node_name_as_is,
    extract_base_name,
    extract_qualifier,
    extract_quantifier,
    compose_node_id
)


class TestExtractNodeNameAsIs:
    """Test cases for extract_node_name_as_is function."""
    
    def test_basic_heading(self):
        """Test basic markdown heading extraction."""
        result = extract_node_name_as_is("# My Node")
        assert result == "My Node"
        
    def test_multiple_hash_symbols(self):
        """Test heading with multiple hash symbols."""
        result = extract_node_name_as_is("### Node Name")
        assert result == "Node Name"
        
    def test_heading_with_spaces(self):
        """Test heading with extra spaces."""
        result = extract_node_name_as_is("  #   Node with spaces   ")
        assert result == "#   Node with spaces"
        
    def test_heading_with_markdown(self):
        """Test heading that contains markdown formatting."""
        result = extract_node_name_as_is("### **Bold** Node")
        assert result == "**Bold** Node"
        
    def test_no_hash_symbols(self):
        """Test text without hash symbols."""
        result = extract_node_name_as_is("Plain Node Name")
        assert result == "Plain Node Name"
        
    def test_empty_string(self):
        """Test empty string."""
        result = extract_node_name_as_is("")
        assert result == ""
        
    def test_only_hash_symbols(self):
        """Test string with only hash symbols."""
        result = extract_node_name_as_is("###")
        assert result == ""
        
    def test_hash_symbols_with_spaces(self):
        """Test hash symbols followed by spaces."""
        result = extract_node_name_as_is("###   ")
        assert result == ""


class TestExtractBaseName:
    """Test cases for extract_base_name function."""
    
    def test_bold_text_removal(self):
        """Test removal of bold text."""
        result = extract_base_name("**Bold** node")
        assert result == "node"
        
    def test_italic_text_removal(self):
        """Test removal of italic text."""
        result = extract_base_name("*italic* node")
        assert result == "node"
        
    def test_underlined_text_removal(self):
        """Test removal of underlined text."""
        result = extract_base_name("++Underlined++ node")
        assert result == "node"
        
    def test_modality_brackets_removal(self):
        """Test removal of modality brackets."""
        result = extract_base_name("[possibly] node")
        assert result == "node"
        
    def test_multiple_formats_removal(self):
        """Test removal of multiple markdown formats."""
        result = extract_base_name("**Bold** *italic* ++underlined++ [possibly] node")
        assert result == "node"
        
    def test_no_markdown(self):
        """Test text without markdown formatting."""
        result = extract_base_name("simple_node_name")
        assert result == "simple_node_name"
        
    def test_empty_string(self):
        """Test empty string."""
        result = extract_base_name("")
        assert result == ""
        
    def test_only_markdown(self):
        """Test string with only markdown formatting."""
        result = extract_base_name("**Bold** *italic*")
        assert result == ""
        
    def test_nested_bold_italic(self):
        """Test nested bold and italic formatting."""
        result = extract_base_name("**Bold *italic* text** node")
        assert result == "*italic* node"
        
    def test_partial_markdown(self):
        """Test partial markdown formatting."""
        result = extract_base_name("**Bold** node *italic*")
        assert result == "node"
        
    def test_complex_markdown(self):
        """Test complex markdown formatting."""
        result = extract_base_name("++Underlined++ [possibly] **important** *some* node")
        assert result == "node"


class TestExtractQualifier:
    """Test cases for extract_qualifier function."""
    
    def test_basic_bold_qualifier(self):
        """Test extraction of basic bold qualifier."""
        result = extract_qualifier("**Important** node")
        assert result == "Important"
        
    def test_bold_with_spaces(self):
        """Test bold qualifier with spaces."""
        result = extract_qualifier("**Very Important** node")
        assert result == "Very Important"
        
    def test_multiple_bold_sections(self):
        """Test multiple bold sections (should return first)."""
        result = extract_qualifier("**First** node **Second**")
        assert result == "First"
        
    def test_bold_with_italic(self):
        """Test bold qualifier with italic text."""
        result = extract_qualifier("**Bold** *italic* node")
        assert result == "Bold"
        
    def test_no_bold_qualifier(self):
        """Test text without bold qualifier."""
        result = extract_qualifier("node without qualifier")
        assert result == ""
        
    def test_empty_string(self):
        """Test empty string."""
        result = extract_qualifier("")
        assert result == ""
        
    def test_only_bold(self):
        """Test string with only bold text."""
        result = extract_qualifier("**Bold Only**")
        assert result == "Bold Only"
        
    def test_bold_with_special_characters(self):
        """Test bold qualifier with special characters."""
        result = extract_qualifier("**Special-Node@123** node")
        assert result == "Special-Node@123"
        
    def test_bold_with_numbers(self):
        """Test bold qualifier with numbers."""
        result = extract_qualifier("**Node123** node")
        assert result == "Node123"
        
    def test_bold_with_unicode(self):
        """Test bold qualifier with unicode characters."""
        result = extract_qualifier("**Nóde世界** node")
        assert result == "Nóde世界"


class TestExtractQuantifier:
    """Test cases for extract_quantifier function."""
    
    def test_basic_italic_quantifier(self):
        """Test extraction of basic italic quantifier."""
        result = extract_quantifier("*some* node")
        assert result == "some"
        
    def test_italic_with_spaces(self):
        """Test italic quantifier with spaces."""
        result = extract_quantifier("*very important* node")
        assert result == "very important"
        
    def test_italic_with_bold(self):
        """Test italic quantifier with bold text."""
        result = extract_quantifier("**Bold** *italic* node")
        assert result == "italic"
        
    def test_multiple_italic_sections(self):
        """Test multiple italic sections (should return first)."""
        result = extract_quantifier("*first* node *second*")
        assert result == "first"
        
    def test_no_italic_quantifier(self):
        """Test text without italic quantifier."""
        result = extract_quantifier("node without quantifier")
        assert result == ""
        
    def test_empty_string(self):
        """Test empty string."""
        result = extract_quantifier("")
        assert result == ""
        
    def test_only_italic(self):
        """Test string with only italic text."""
        result = extract_quantifier("*Italic Only*")
        assert result == "Italic Only"
        
    def test_italic_with_special_characters(self):
        """Test italic quantifier with special characters."""
        result = extract_quantifier("*Special-Node@123* node")
        assert result == "Special-Node@123"
        
    def test_italic_with_numbers(self):
        """Test italic quantifier with numbers."""
        result = extract_quantifier("*Node123* node")
        assert result == "Node123"
        
    def test_italic_with_unicode(self):
        """Test italic quantifier with unicode characters."""
        result = extract_quantifier("*Nóde世界* node")
        assert result == "Nóde世界"
        
    def test_bold_not_mistaken_for_italic(self):
        """Test that bold text is not mistaken for italic."""
        result = extract_quantifier("**Bold** node")
        assert result == ""
        
    def test_adjacent_asterisks(self):
        """Test that adjacent asterisks don't interfere."""
        result = extract_quantifier("**Bold** *italic* node")
        assert result == "italic"


class TestComposeNodeId:
    """Test cases for compose_node_id function."""
    
    def test_all_components_present(self):
        """Test composition with all components present."""
        result = compose_node_id("some", "important", "node")
        assert result == "some_important_node"
        
    def test_missing_quantifier(self):
        """Test composition with missing quantifier."""
        result = compose_node_id("", "special", "entity")
        assert result == "special_entity"
        
    def test_missing_qualifier(self):
        """Test composition with missing qualifier."""
        result = compose_node_id("all", "", "object")
        assert result == "all_object"
        
    def test_only_base_name(self):
        """Test composition with only base name."""
        result = compose_node_id("", "", "base")
        assert result == "base"
        
    def test_missing_base_name(self):
        """Test composition with missing base name."""
        result = compose_node_id("some", "important", "")
        assert result is None
        
    def test_missing_base_name_with_report(self):
        """Test composition with missing base name and error reporting."""
        report = []
        result = compose_node_id("some", "important", "", report)
        assert result is None
        assert len(report) == 1
        assert report[0]["type"] == "error"
        assert report[0]["stage"] == "compose_node_id"
        assert "base_name" in report[0]["message"]
        
    def test_empty_components(self):
        """Test composition with all empty components."""
        result = compose_node_id("", "", "")
        assert result is None
        
    def test_components_with_spaces(self):
        """Test composition with components containing spaces."""
        result = compose_node_id("very important", "special case", "base name")
        assert result == "very important_special case_base name"
        
    def test_components_with_special_characters(self):
        """Test composition with special characters."""
        result = compose_node_id("node@123", "special-node", "base_name")
        assert result == "node@123_special-node_base_name"
        
    def test_components_with_unicode(self):
        """Test composition with unicode characters."""
        result = compose_node_id("nóde世界", "special世界", "base世界")
        assert result == "nóde世界_special世界_base世界"
        
    def test_multiple_empty_components(self):
        """Test composition with multiple empty components."""
        result = compose_node_id("", "", "base")
        assert result == "base"
        
    def test_no_report_parameter(self):
        """Test composition without report parameter."""
        result = compose_node_id("some", "important", "")
        assert result is None
        
    def test_report_parameter_none(self):
        """Test composition with report parameter as None."""
        result = compose_node_id("some", "important", "", None)
        assert result is None


class TestNodeUtilsIntegration:
    """Integration test cases for node_utils module."""
    
    def test_full_extraction_workflow(self):
        """Test the complete extraction and composition workflow."""
        # Test with a complex node name
        heading = "### **Important** *some* node"
        
        # Extract components
        node_name = extract_node_name_as_is(heading)
        base_name = extract_base_name(node_name)
        qualifier = extract_qualifier(node_name)
        quantifier = extract_quantifier(node_name)
        
        # Compose node ID
        node_id = compose_node_id(quantifier, qualifier, base_name)
        
        # Verify results
        assert node_name == "**Important** *some* node"
        assert base_name == "node"
        assert qualifier == "Important"
        assert quantifier == "some"
        assert node_id == "some_Important_node"
        
    def test_extraction_consistency(self):
        """Test consistency of extraction functions."""
        test_cases = [
            ("**Bold** *italic* node", "node", "Bold", "italic"),
            ("*quantifier* **qualifier** base", "base", "qualifier", "quantifier"),
            ("simple_node", "simple_node", "", ""),
            ("**Only Bold**", "", "Only Bold", ""),
            ("*Only Italic*", "", "", "Only Italic"),
        ]
        
        for node_name, expected_base, expected_qualifier, expected_quantifier in test_cases:
            base = extract_base_name(node_name)
            qualifier = extract_qualifier(node_name)
            quantifier = extract_quantifier(node_name)
            
            assert base == expected_base
            assert qualifier == expected_qualifier
            assert quantifier == expected_quantifier
            
    def test_composition_edge_cases(self):
        """Test edge cases in node ID composition."""
        edge_cases = [
            (("", "", "base"), "base"),
            (("quant", "", "base"), "quant_base"),
            (("", "qual", "base"), "qual_base"),
            (("quant", "qual", "base"), "quant_qual_base"),
            (("", "", ""), None),
        ]
        
        for (quant, qual, base), expected in edge_cases:
            result = compose_node_id(quant, qual, base)
            assert result == expected


if __name__ == "__main__":
    pytest.main([__file__]) 