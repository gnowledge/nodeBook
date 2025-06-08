import re
import json
import networkx as nx
from pathlib import Path
from typing import List, Dict, Optional

from core.utils import normalize_id, load_text_file, save_json_file, load_json_file
from core.registry import load_node_registry, update_node_registry, create_node_if_missing
from core.schema_ops import load_schema



def parse_logical_cnl(cnl_text: str, subject: str | None = None) -> list:
    """
    Parses a block of Controlled Natural Language into structured facts.
    If 'subject' is provided, it is injected as subject (for relations)
    or target (for attributes).
    """
    lines = [line.strip() for line in cnl_text.strip().splitlines() if line.strip()]
    facts = []
    
    for line in lines:
        if line.startswith("<") and ">" in line:
            # Parse a relation
            rel_end = line.index(">")
            name = line[1:rel_end].strip()
            obj = line[rel_end+1:].strip()
            if not obj:
                continue
            facts.append({
                "type": "relation",
                "name": name,
                "subject": subject,
                "object": obj.lower()
            })
        elif line.lower().startswith("has ") or line.startswith("<has ") or ":" in line:
            parts = line.split(":", 1)
            if len(parts) == 2:
                label = parts[0].replace("<", "").replace(">", "").strip()
                name = label.replace("has", "").strip()
                value_part = parts[1].strip()

                # Extract unit if in parentheses
                if value_part.endswith(")"):
                    unit_start = value_part.rfind("(")
                    if unit_start != -1:
                        value = value_part[:unit_start].strip()
                        unit = value_part[unit_start+1:-1].strip()
                    else:
                        value = value_part
                        unit = ""
                else:
                    value = value_part
                    unit = ""

                facts.append({
                    "type": "attribute",
                    "name": name,
                    "value": value,
                    "unit": unit,
                    "target": subject
                })

        # Note: target node creation moved to parse_graph where user_id and graph_id are available

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
                r"define relation '?(.+?)'?\s+with inverse '?(.+?)'(?: between '?(.+?)'? and '?(.+?)'?)?\.",
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


def extract_node_sections_from_markdown(md_text: str) -> List[Dict]:
    sections = []
    current_node = None
    current_desc_lines = []
    current_cnl_lines = []
    in_cnl_block = False

    lines = md_text.splitlines()

    for line in lines:
        line_strip = line.strip()

        # Start of a new node section
        if line_strip.startswith("# "):
            if current_node:
                sections.append({
                    "id": current_node,
                    "description": "\n".join(current_desc_lines).strip(),
                    "cnl": "\n".join(current_cnl_lines).strip()
                })
            current_node = line_strip[2:].strip()
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
    if current_node:
        sections.append({
            "id": current_node,
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
    from core.cnl_parser import extract_node_sections_from_markdown, parse_logical_cnl, normalize_id

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
        node_id = normalize_id(section["id"])
        parsed["nodes"].append(node_id)

        # Ensure node is registered and optionally created
        if node_id not in registry:
            create_node_if_missing(user_id, node_id, name=section["id"])
            update_node_registry(registry, node_id, graph_id)
        else:
            if graph_id not in registry[node_id].get("graphs", []):
                registry[node_id]["graphs"].append(graph_id)

        facts = parse_logical_cnl(section["cnl"])

        for fact in facts:
            if fact["type"] == "relation":
                parsed["relations"].append({
                    "name": fact["name"],
                    "source": fact["subject"],
                    "target": fact["object"]
                })
            elif fact["type"] == "attribute":
                parsed["attributes"].append({
                    "name": fact["name"],
                    "value": fact["value"],
                    "unit": fact.get("unit", ""),
                    "target": fact["target"]
                })

    save_json_file(Path(f"data/users/{user_id}/node_registry.json"), registry)
    save_json_file(parsed_path, parsed)

    return parsed
