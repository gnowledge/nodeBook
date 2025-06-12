import re
import json
import networkx as nx
from pathlib import Path
from typing import List, Dict, Optional

from core.utils import normalize_id, load_text_file, save_json_file, load_json_file
from core.registry import load_node_registry, update_node_registry, create_node_if_missing
from core.schema_ops import load_schema



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


def parse_cnl_to_parsed_json(user_id: str, graph_id: str) -> dict:
    from core.utils import load_text_file, save_json_file
    from core.registry import load_node_registry, update_node_registry, create_node_if_missing
    from pathlib import Path
    from core.cnl_parser import extract_node_sections_from_markdown, parse_logical_cnl, parse_node_title, normalize_id

    # 🔧 Correct path to cnl.md inside graph folder
    graph_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/cnl.md")
    parsed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/parsed.json")

    if not graph_path.exists():
        raise FileNotFoundError(f"Graph file not found: {graph_path}")

    raw_md = load_text_file(graph_path)
    sections = extract_node_sections_from_markdown(raw_md)
    registry = load_node_registry(user_id)

    parsed = {
        "graph_id": graph_id,
        "nodes": [],
        "relations": [],
        "attributes": []
    }

    for section in sections:
        # Always re-parse the node title to ensure clean id/name/base
        title_info = parse_node_title(section.get("title") or section.get("name") or section.get("id"))
        node_id = title_info["id"]
        node_obj = {
            "id": node_id,
            "base": title_info.get("base"),
            "quantifier": title_info.get("quantifier"),
            "qualifier": title_info.get("qualifier"),
            "name": title_info.get("name"),
            "description": section.get("description", "")
        }
        # Only add if not already present (avoid duplicates)
        if not any(n["id"] == node_id for n in parsed["nodes"]):
            parsed["nodes"].append(node_obj)

        # Ensure node is registered and optionally created
        if node_id not in registry:
            create_node_if_missing(user_id, node_id, name=title_info.get("name"))
            update_node_registry(registry, node_id, graph_id)
        else:
            if graph_id not in registry[node_id].get("graphs", []):
                registry[node_id]["graphs"].append(graph_id)

        facts = parse_logical_cnl(section["cnl"], subject=node_id)

        for fact in facts:
            if fact["type"] == "relation":
                # Ensure target node is present in nodes if not already
                target_id = fact["target"]
                # --- Use the original target string for canonical parse ---
                # We need to get the original CNL string for the target node, not just the id
                # To do this, parse_logical_cnl must return the original target string as 'target_cnl'
                # So update parse_logical_cnl to include 'target_cnl' in the relation fact
                target_cnl = fact.get("target_cnl", target_id.replace('_', ' '))
                if not any(n["id"] == target_id for n in parsed["nodes"]):
                    # Use the original CNL string for the target node if available
                    target_cnl = fact.get("target_cnl", target_id.replace('_', ' '))
                    # Use the original string as both the name and base (preserving user input)
                    target_title_info = parse_node_title(target_cnl)
                    parsed["nodes"].append({
                        "id": target_id,  # Use the canonical id already computed
                        "base": target_cnl.strip(),  # Use the original CNL string as base
                        "quantifier": target_title_info.get("quantifier"),
                        "qualifier": target_title_info.get("qualifier"),
                        "name": target_cnl.strip(),  # Use the original CNL string as name
                        "description": "",
                        "attributes": [],
                        "relations": []
                    })
                parsed["relations"].append({
                    "name": fact["name"],
                    "adverb": fact.get("adverb"),
                    "modality": fact.get("modality"),
                    "source": fact.get("subject"),
                    "target": fact.get("target"),
                    "target_quantifier": fact.get("target_quantifier"),
                    "target_qualifier": fact.get("target_qualifier")
                })
            elif fact["type"] == "attribute":
                parsed["attributes"].append({
                    "name": fact["name"],
                    "adverb": fact.get("adverb"),
                    "modality": fact.get("modality"),
                    "value": fact.get("value"),
                    "unit": fact.get("unit", ""),
                    "target": fact["target"]
                })

    save_json_file(Path(f"data/users/{user_id}/node_registry.json"), registry)
    save_json_file(parsed_path, parsed)

    return parsed
