import re
import json
import os
import networkx as nx
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any

from backend.core.utils import normalize_id, load_text_file, save_json_file, load_json_file
from backend.core.schema_ops import load_schema


# --- Extraction helpers for CNL markup ---
def extract_qualifier(text):
    """Extracts qualifier (bold, e.g. **female**) and returns (qualifier, rest)."""
    pattern = r'(\*\*|__)(.+?)\1\s*(.*)'
    match = re.match(pattern, text)
    if match:
        return match.group(2).strip(), match.group(3).strip()
    return None, text

def extract_quantifier(text):
    """Extracts quantifier (italic, e.g. *all*) and returns (quantifier, rest). Only matches single asterisk, not bold. """
    # Only match *...* not **...**
    pattern = r'(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)\s*(.*)'
    match = re.match(pattern, text)
    if match:
        return match.group(1).strip(), match.group(2).strip()
    return None, text

def extract_adverb(text):
    """Extracts adverb (double plus, e.g. ++quickly++) and returns (adverb, rest)."""
    pattern = r'(\+\+)(.+?)\1\s*(.*)'
    match = re.match(pattern, text)
    if match:
        return match.group(2).strip(), match.group(3).strip()
    return None, text

def extract_base(text):
    """Removes all markup and returns a clean base name."""
    # Remove bold and italic markup
    text = re.sub(r'(\*\*|__)(.+?)(\*\*|__)', '', text)
    text = re.sub(r'(\*)(.+?)(\*)', '', text)
    # Remove any remaining non-alphanumeric except space
    text = re.sub(r'[^a-zA-Z0-9 ]', '', text)
    return text.strip()

def build_node_id(quantifier, qualifier, base):
    # Only include non-empty parts, join with underscores, lowercased, and normalize
    parts = [p for p in [quantifier, qualifier, base] if p]
    id_str = '_'.join(parts)
    id_str = re.sub(r'\s+', '_', id_str)  # Replace spaces with underscores
    return normalize_id(id_str)

def build_node_name(quantifier, qualifier, base):
    # Only include non-empty parts, join with spaces, capitalize first letter
    parts = [p for p in [quantifier, qualifier, base] if p]
    name_str = ' '.join(parts)
    name_str = re.sub(r'\s+', ' ', name_str).strip()
    return name_str[:1].upper() + name_str[1:] if name_str else ''


def parse_logical_cnl(cnl_text: str, subject: str | None = None) -> list:
    """
    Parses a block of Controlled Natural Language into structured facts.
    If 'subject' is provided, it is injected as subject (for relations)
    or target (for attributes).
    Supports quantifier, qualifier, adverb, modality, unit, etc.
    """
    lines = [line.strip() for line in cnl_text.strip().splitlines() if line.strip()]
    facts = []
    
    for line in lines:
        # --- Relation Parsing ---
        # Example: ++quickly++ <competes_with> *all* **rival** species [probably]
        rel_pattern = re.compile(r"^\s*(\+\+(.+?)\+\+)?\s*<([^>]+)>\s*(.*?)(\s*\[(.+?)\])?$")
        rel_match = rel_pattern.match(line)
        if rel_match:
            adverb = rel_match.group(2)
            rel_name = rel_match.group(3).strip()
            # Everything after the relation is the target (with possible markup)
            target_full = rel_match.group(4).strip()
            # Remove trailing modality if present
            if rel_match.group(5):
                target_full = target_full[:target_full.rfind('[')].strip()
            modality = rel_match.group(6).strip() if rel_match.group(6) else None

            # Always use parse_node_title on the full target string
            target_title_info = parse_node_title(target_full)
            target_id = target_title_info["id"]
            target_quant = target_title_info["qualifier"]
            target_qual = target_title_info["qualifier"]

            facts.append({
                "type": "relation",
                "name": rel_name,
                "adverb": adverb,
                "modality": modality,
                "subject": subject,
                "target_quantifier": target_quant,
                "target_qualifier": target_qual,
                "target": target_id,
                "target_cnl": target_full  # <--- propagate original CNL string for target
            })
            continue

        # --- Attribute Parsing ---
        # Example: has growth_rate: ++rapidly++ 5 *cm/year* [uncertain]
        attr_pattern = re.compile(r"^(has|<has)?\s*([\w_]+)\s*:\s*(\+\+(.+?)\+\+\s*)?([*]?(.+?)[*]?\s*)?([^\[]+?)(\s*\*([^*]+)\*)?(\s*\[(.+?)\])?$", re.IGNORECASE)
        # Simpler, more robust pattern:
        attr_line = line if line.lower().startswith("has ") or line.startswith("<has ") or ":" in line else None
        if attr_line:
            # Split at first ':'
            parts = attr_line.split(":", 1)
            if len(parts) == 2:
                label = parts[0].replace("<", "").replace(">", "").strip()
                name = label.replace("has", "").strip()
                value_part = parts[1].strip()

                # Extract adverb (e.g. ++rapidly++)
                adverb = None
                m_adv = re.match(r"^\+\+(.+?)\+\+\s*(.*)$", value_part)
                if m_adv:
                    adverb = m_adv.group(1).strip()
                    value_part = m_adv.group(2).strip()

                # Extract modality (e.g. [uncertain])
                modality = None
                m_mod = re.match(r"(.*)\[(.+?)\]\s*$", value_part)
                if m_mod:
                    value_part = m_mod.group(1).strip()
                    modality = m_mod.group(2).strip()

                # Extract unit (e.g. 5 *cm/year*)
                unit = None
                m_unit = re.match(r"(.+?)\s*\*([^*]+)\*\s*$", value_part)
                if m_unit:
                    value = m_unit.group(1).strip()
                    unit = m_unit.group(2).strip()
                else:
                    value = value_part

                facts.append({
                    "type": "attribute",
                    "name": name,
                    "adverb": adverb,
                    "modality": modality,
                    "value": value,
                    "unit": unit,
                    "target": subject
                })
            continue

        # ...existing code for legacy/define statements, is_a, etc...
        # --- Handle Define statements ---
        if line.lower().startswith("define attribute"):
            m = re.match(
                r"define attribute '?(.+?)'?\s+as a (\w+)(?: with unit '?(.+?)'?)?(?: applicable to (.+?))?\.",
                line, flags=re.IGNORECASE)
            if m:
                name, data_type, unit, classes = m.groups()
                facts.append({
                    "type": "define_attribute",
                    "name": name,
                    "data_type": data_type,
                    "unit": unit or "",
                    "applicable_classes": [c.strip(" '") for c in classes.split(",")] if classes else []
                })
                continue

        if line.lower().startswith("define relation"):
            m = re.match(
                r"define relation '?(.+?)'?	with inverse '?(.+?)'(?: between '?(.+?)'? and '?(.+?)'?)?\.",
                line, flags=re.IGNORECASE)
            if m:
                name, inverse, domain, range_ = m.groups()
                facts.append({
                    "type": "define_relation",
                    "name": name,
                    "inverse": inverse,
                    "domain": domain,
                    "range": range_,
                })
                continue

        # --- Match relation: part of / member of (MUST come before is_a) ---
        m_rel = re.match(r"'?(.+?)'?\s+(?:is\s+)?(part of|member of)\s+'?(.+?)'?\.", line, flags=re.IGNORECASE)
        if m_rel:
            subj, rel, obj = m_rel.groups()
            facts.append({
                "type": "relation",
                "subject": normalize_id(subj),
                "object": normalize_id(obj),
                "name": rel.strip()
            })
            continue

        # --- Match is_a: "X is a Y" or "X is Y" ---
        m_is = re.match(r"'?(.+?)'?\s+is(?: a| an)?\s+'?(.+?)'?\.", line, flags=re.IGNORECASE)
        if m_is:
            subj, obj = m_is.groups()
            facts.append({
                "type": "node",
                "id": normalize_id(subj),
                "name": subj.strip(),
                "is_a": obj.strip()
            })
            continue

        # --- Match attribute assignment ---
        m_attr = re.match(
            r"assign attribute '?(.+?)'?\s+to\s+'?(.+?)'?\s+with value\s+(.+?)\s+and unit '?(.+?)'?",
            line, flags=re.IGNORECASE)
        if m_attr:
            name, subj, val, unit = m_attr.groups()
            facts.append({
                "type": "attribute",
                "target": normalize_id(subj),
                "name": name.strip(),
                "value": val.strip(),
                "unit": unit.strip()
            })
            continue

    return facts


def build_nbh_with_networkx(flat_entries):
    G = nx.MultiDiGraph()
    node_descriptions = {}

    for entry in flat_entries:
        if entry["type"] == "node":
            G.add_node(entry["id"])
            node_descriptions[entry["id"]] = entry.get("description", "")
        elif entry["type"] == "attribute":
            subj = entry["subject"]
            if "attributes" not in G.nodes[subj]:
                G.nodes[subj]["attributes"] = []
            G.nodes[subj]["attributes"].append({
                "name": entry["name"],
                "value": entry["value"],
                "unit": entry["unit"]
            })
        elif entry["type"] == "relation":
            G.add_edge(entry["subject"], entry["object"], key=entry["name"], label=entry["name"])

    output = {"nodes": []}
    for node_id in G.nodes:
        node_data = {
            "id": node_id,
            "description": node_descriptions.get(node_id, ""),
            "attributes": G.nodes[node_id].get("attributes", []),
            "relations": []
        }
        for _, target, key, edge_data in G.out_edges(node_id, keys=True, data=True):
            node_data["relations"].append({
                "name": edge_data["label"],
                "object": target
            })
        output["nodes"].append(node_data)

    return output




def parse_cnl_block(block: str, log: Optional[List[str]] = None) -> List[Dict]:
    lines = block.strip().splitlines()
    statements = []

    for idx, line in enumerate(lines):
        original = line.strip()
        if not original:
            continue

        # Strip leading Declare: if present
        if original.lower().startswith("declare:"):
            original = original[len("declare:"):].strip()

        # --- Handle Define statements ---
        if original.lower().startswith("define attribute"):
            m = re.match(
                r"define attribute '?(.+?)'?\s+as a (\w+)(?: with unit '?(.+?)'?)?(?: applicable to (.+?))?\.",
                original, flags=re.IGNORECASE)
            if m:
                name, data_type, unit, classes = m.groups()
                statements.append({
                    "type": "define_attribute",
                    "name": name,
                    "data_type": data_type,
                    "unit": unit or "",
                    "applicable_classes": [c.strip(" '") for c in classes.split(",")] if classes else []
                })
                continue

        if original.lower().startswith("define relation"):
            m = re.match(
                r"define relation '?(.+?)'?	s+with inverse '?(.+?)'(?: between '?(.+?)'? and '?(.+?)'?)?\.",
                original, flags=re.IGNORECASE)
            if m:
                name, inverse, domain, range_ = m.groups()
                statements.append({
                    "type": "define_relation",
                    "name": name,
                    "inverse": inverse,
                    "domain": domain,
                    "range": range_,
                })
                continue

        # --- Match relation: part of / member of (MUST come before is_a) ---
        m_rel = re.match(r"'?(.+?)'?\s+(?:is\s+)?(part of|member of)\s+'?(.+?)'?\.", original, flags=re.IGNORECASE)
        if m_rel:
            subj, rel, obj = m_rel.groups()
            statements.append({
                "type": "relation",
                "subject": normalize_id(subj),
                "object": normalize_id(obj),
                "name": rel.strip()
            })
            continue

        # --- Match is_a: "X is a Y" or "X is Y" ---
        m_is = re.match(r"'?(.+?)'?\s+is(?: a| an)?\s+'?(.+?)'?\.", original, flags=re.IGNORECASE)
        if m_is:
            subj, obj = m_is.groups()
            statements.append({
                "type": "node",
                "id": normalize_id(subj),
                "name": subj.strip(),
                "is_a": obj.strip()
            })
            continue

        # --- Match attribute assignment ---
        m_attr = re.match(
            r"assign attribute '?(.+?)'?\s+to\s+'?(.+?)'?\s+with value\s+(.+?)\s+and unit '?(.+?)'?",
            original, flags=re.IGNORECASE)
        if m_attr:
            name, subj, val, unit = m_attr.groups()
            statements.append({
                "type": "attribute",
                "target": normalize_id(subj),
                "name": name.strip(),
                "value": val.strip(),
                "unit": unit.strip()
            })
            continue

        if log is not None:
            log.append(f"Unrecognized line {idx + 1}: {line.strip()}")

    return statements



def extract_cnl_blocks(markdown: str) -> List[str]:
    """
    Extract all :::cnl code blocks from the markdown text.
    Returns a list of code block strings (without :::cnl ... ::: markers).
    """
    pattern = r":::cnl(.*?):::"
    matches = re.findall(pattern, markdown, re.DOTALL | re.IGNORECASE)
    return [block.strip() for block in matches]


def parse_node_title(title: str) -> dict:
    """
    Parse a node section title for quantifier (italic), qualifier (bold), and base name.
    Returns a dict with quantifier, qualifier, base, and normalized id.
    """
    text = title.strip()
    quantifier, rest = extract_quantifier(text)
    print(f"[parse_node_title] quantifier: {quantifier}, rest after quantifier: '{rest}'")
    qualifier, rest = extract_qualifier(rest)
    print(f"[parse_node_title] qualifier: {qualifier}, rest after qualifier: '{rest}'")
    base = extract_base(rest)
    print(f"[parse_node_title] base: '{base}'")
    node_id = build_node_id(quantifier, qualifier, base)
    node_name = build_node_name(quantifier, qualifier, base)
    print(f"[parse_node_title] node_id: '{node_id}', node_name: '{node_name}'")
    return {
        "id": node_id,
        "base": base,
        "quantifier": quantifier,
        "qualifier": qualifier,
        "name": node_name,
        "title": title.strip(),
    }


def extract_node_sections_from_markdown(md_text: str) -> List[Dict]:
    sections = []
    current_node = None
    current_desc_lines = []
    current_cnl_lines = []
    in_cnl_block = False
    current_node_fields = None

    lines = md_text.splitlines()

    for line in lines:
        line_strip = line.strip()

        # Start of a new node section
        if line_strip.startswith("# "):
            if current_node_fields:
                sections.append({
                    **current_node_fields,
                    "description": "\n".join(current_desc_lines).strip(),
                    "cnl": "\n".join(current_cnl_lines).strip()
                })
            current_node_fields = parse_node_title(line_strip[2:].strip())
            current_desc_lines = []
            current_cnl_lines = []
            in_cnl_block = False
        elif line_strip.startswith(":::cnl"):
            in_cnl_block = True
        elif line_strip.startswith(":::") and in_cnl_block:
            in_cnl_block = False
        else:
            if in_cnl_block:
                current_cnl_lines.append(line)
            else:
                current_desc_lines.append(line)

    # Append the last section
    if current_node_fields:
        sections.append({
            **current_node_fields,
            "description": "\n".join(current_desc_lines).strip(),
            "cnl": "\n".join(current_cnl_lines).strip()
        })

    return sections

def ensure_nodes_exist(parsed_statements):
    declared_ids = {stmt['id'] for stmt in parsed_statements if stmt['type'] == 'node'}
    mentioned_ids = set()

    for stmt in parsed_statements:
        if stmt['type'] == 'relation':
            mentioned_ids.add(stmt.get('subject'))
            mentioned_ids.add(stmt.get('object'))
        elif stmt['type'] == 'attribute':
            mentioned_ids.add(stmt.get('target'))

    new_nodes = []
    for node_id in mentioned_ids:
        if node_id and node_id not in declared_ids:
            new_nodes.append({
                'type': 'node',
                'id': node_id,
                'name': node_id,
                'description': ''
            })

    return parsed_statements + new_nodes


def save_section_node(user_id: str, graph_id: str, section_text: str, section_name: str = None):
    """
    Parse and save a node from a markdown section.
    
    Args:
        user_id: User ID
        graph_id: Graph ID
        section_text: The markdown section text
        section_name: Optional section name
    
    Returns:
        Dictionary with parsing results
    """
    try:
        # Parse the section
        parsed_data = parse_logical_cnl(section_text)
        
        if not parsed_data:
            return {"success": False, "error": "Failed to parse section"}
        
        # Extract node information
        title_info = parsed_data.get("title", {})
        node_id = title_info.get("id")
        name = title_info.get("name")
        
        if not node_id:
            return {"success": False, "error": "No node ID found in section"}
        
        # Import registry functions locally to avoid circular imports
        from backend.core.registry import load_node_registry, update_node_registry, create_node_if_missing
        
        # Load registry and create/update node
        registry = load_node_registry(user_id)
        create_node_if_missing(user_id, str(node_id), name=str(name) if name else "")
        update_node_registry(registry, str(node_id), graph_id)
        
        return {
            "success": True,
            "node_id": node_id,
            "name": name,
            "parsed_data": parsed_data
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}


def generate_cnl_md_from_polymorphic(polymorphic_data: dict) -> str:
    """
    Generate CNL.md content from polymorphic_composed.json data.
    
    This function creates a compact CNL documentation file that shows
    users how to write CNL by converting the graph structure into readable
    CNL examples. The file is designed to be read-only and educational.
    
    Args:
        polymorphic_data: Dictionary containing nodes, relations, attributes, and transitions
        
    Returns:
        str: Markdown content with CNL examples and explanations
    """
    md_lines = []
    
    # Header
    md_lines.append("# CNL (Controlled Natural Language) Examples")
    md_lines.append("")
    md_lines.append("This file shows examples of how to write CNL based on the current graph structure.")
    md_lines.append("Use these patterns as a guide for writing your own CNL statements.")
    md_lines.append("")
    
    # Extract data
    nodes = polymorphic_data.get("nodes", [])
    relations = polymorphic_data.get("relations", [])
    attributes = polymorphic_data.get("attributes", [])
    
    # Create a map of relation/attribute IDs to their data for quick lookup
    relation_map = {rel.get("id"): rel for rel in relations}
    attribute_map = {attr.get("id"): attr for attr in attributes}
    
    # Process each node
    for node in nodes:
        node_id = node.get("id") or node.get("node_id") or ""
        name = node.get("name", node_id) or ""
        adjective = node.get("adjective", "")
        description = node.get("description", "")
        
        # Build rendered name: adjective + base-name
        rendered_name = name
        if adjective:
            rendered_name = f"{adjective} {name}"
        
        # Start node section
        md_lines.append(f"# {rendered_name}")
        if description:
            md_lines.append("")
            md_lines.append(description)
        md_lines.append("")
        
        # Check if node has morphs
        morphs = node.get("morphs", [])
        nbh = node.get("nbh")
        
        if not morphs:
            # Simple node without morphs - check for direct relations/attributes
            relations_list = node.get("relations", [])
            attributes_list = node.get("attributes", [])
            
            if relations_list or attributes_list:
                md_lines.append("::: cnl")
                # Add relations
                for rel in relations_list:
                    cnl_line = build_cnl_relation_line(rel, node_id)
                    if cnl_line:
                        md_lines.append(cnl_line)
                
                # Add attributes
                for attr in attributes_list:
                    cnl_line = build_cnl_attribute_line(attr, node_id)
                    if cnl_line:
                        md_lines.append(cnl_line)
                md_lines.append(":::")
                md_lines.append("")
        else:
            # Node with morphs
            if len(morphs) == 1:
                # Single morph - treat like simple node
                morph = morphs[0]
                morph_id = morph.get("morph_id")
                
                # Check if this is the active morph (nbh)
                if nbh == morph_id:
                    morph_relations = []
                    morph_attributes = []
                    
                    # Get relations from morph
                    for rel_id in morph.get("relationNode_ids", []):
                        if rel_id in relation_map:
                            morph_relations.append(relation_map[rel_id])
                    
                    # Get attributes from morph
                    for attr_id in morph.get("attributeNode_ids", []):
                        if attr_id in attribute_map:
                            morph_attributes.append(attribute_map[attr_id])
                    
                    if morph_relations or morph_attributes:
                        md_lines.append("::: cnl")
                        # Add relations
                        for rel in morph_relations:
                            cnl_line = build_cnl_relation_line(rel, node_id)
                            if cnl_line:
                                md_lines.append(cnl_line)
                        
                        # Add attributes
                        for attr in morph_attributes:
                            cnl_line = build_cnl_attribute_line(attr, node_id)
                            if cnl_line:
                                md_lines.append(cnl_line)
                        md_lines.append(":::")
                        md_lines.append("")
            else:
                # Multiple morphs - use subsections
                for morph in morphs:
                    morph_id = morph.get("morph_id")
                    morph_name = morph.get("name", "")
                    morph_adjective = morph.get("adjective", "")
                    morph_description = morph.get("description", "")
                    
                    # Build morph rendered name
                    morph_rendered_name = morph_name
                    if morph_adjective:
                        morph_rendered_name = f"{morph_adjective} {morph_name}"
                    
                    # Check if this morph has content
                    morph_relations = []
                    morph_attributes = []
                    
                    # Get relations from morph
                    for rel_id in morph.get("relationNode_ids", []):
                        if rel_id in relation_map:
                            morph_relations.append(relation_map[rel_id])
                    
                    # Get attributes from morph
                    for attr_id in morph.get("attributeNode_ids", []):
                        if attr_id in attribute_map:
                            morph_attributes.append(attribute_map[attr_id])
                    
                    # Only add subsection if morph has content
                    if morph_relations or morph_attributes:
                        md_lines.append(f"## {morph_rendered_name}")
                        if morph_description:
                            md_lines.append("")
                            md_lines.append(morph_description)
                        md_lines.append("")
                        md_lines.append("::: cnl")
                        
                        # Add relations
                        for rel in morph_relations:
                            cnl_line = build_cnl_relation_line(rel, node_id)
                            if cnl_line:
                                md_lines.append(cnl_line)
                        
                        # Add attributes
                        for attr in morph_attributes:
                            cnl_line = build_cnl_attribute_line(attr, node_id)
                            if cnl_line:
                                md_lines.append(cnl_line)
                        md_lines.append(":::")
                        md_lines.append("")
    
    # Add basic CNL syntax guide at the end
    md_lines.append("---")
    md_lines.append("## CNL Syntax Guide")
    md_lines.append("")
    md_lines.append("### Basic Elements")
    md_lines.append("- **Relations**: `<relation_name> target`")
    md_lines.append("- **Attributes**: `has attribute_name: value`")
    md_lines.append("- **Adverbs**: `++adverb++ <relation> target`")
    md_lines.append("- **Quantifiers**: `*quantifier* <relation> target`")
    md_lines.append("- **Adjectives**: `**adjective** <relation> target`")
    md_lines.append("- **Modality**: `[modality] <relation> target`")
    md_lines.append("")
    md_lines.append("*This file is automatically generated and read-only. Use it as a reference for writing CNL.*")
    
    return "\n".join(md_lines)


def build_cnl_relation_line(rel: dict, subject_id: str) -> str:
    """
    Build a CNL line for a relation.
    
    Args:
        rel: Relation dictionary
        subject_id: The subject node ID
        
    Returns:
        str: CNL line for the relation
    """
    if not rel:
        return ""
    
    cnl_parts = []
    
    # Add modality if present
    if rel.get("modality"):
        cnl_parts.append(f"[{rel['modality']}]")
    
    # Add adverb if present
    if rel.get("adverb"):
        cnl_parts.append(f"++{rel['adverb']}++")
    
    # Add relation
    rel_name = rel.get("name", "")
    if rel_name:
        cnl_parts.append(f"<{rel_name}>")
    
    # Add target
    target_id = rel.get("target_id")
    target_name = rel.get("target_name", target_id)
    if target_name:
        cnl_parts.append(target_name)
    
    return " ".join(cnl_parts) if cnl_parts else ""


def build_cnl_attribute_line(attr: dict, subject_id: str) -> str:
    """
    Build a CNL line for an attribute.
    
    Args:
        attr: Attribute dictionary
        subject_id: The subject node ID
        
    Returns:
        str: CNL line for the attribute
    """
    if not attr:
        return ""
    
    cnl_parts = []
    
    # Add modality if present
    if attr.get("modality"):
        cnl_parts.append(f"[{attr['modality']}]")
    
    # Add adverb if present
    if attr.get("adverb"):
        cnl_parts.append(f"++{attr['adverb']}++")
    
    # Add attribute
    attr_name = attr.get("name", "")
    if attr_name:
        cnl_parts.append(f"has {attr_name}:")
    
    # Add value
    value = attr.get("value", "")
    if value:
        cnl_parts.append(str(value))
    
    # Add unit if present
    unit = attr.get("unit")
    if unit:
        cnl_parts.append(f"*{unit}*")
    
    return " ".join(cnl_parts) if cnl_parts else ""
