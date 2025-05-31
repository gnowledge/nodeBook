import re
from typing import List, Dict, Optional
from core.schema_ops import load_schema

from pathlib import Path
import yaml
import re
import networkx as nx

def normalize_id(name: str) -> str:
    return name.strip().lower().replace(" ", "_")

def parse_logical_cnl(raw_md):
    entries = []
    current_node = None

    sections = re.split(r'^# (.+)$', raw_md, flags=re.MULTILINE)
    if sections[0].strip():
        entries.append({
            "type": "document",
            "description": sections[0].strip()
        })

    for i in range(1, len(sections), 2):
        node_id = sections[i].strip()
        content = sections[i + 1].strip()
        current_node = node_id
        entries.append({
            "type": "node",
            "id": node_id,
            "description": ""
        })

        parts = re.split(r':::cnl\s*\n(.*?)\n:::', content, flags=re.DOTALL)
        text_blocks = parts[::2]
        cnl_blocks = parts[1::2]

        if text_blocks and text_blocks[0].strip():
            entries[-1]["description"] = text_blocks[0].strip()

        for block in cnl_blocks:
            for line in block.strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("has <"):
                    m = re.match(r'has <(.*?)> (.*?) ?(?:\[(.*?)\])?', line)
                    if m:
                        name, value, unit = m.groups()
                        entries.append({
                            "type": "attribute",
                            "subject": current_node,
                            "name": name.strip(),
                            "value": value.strip(),
                            "unit": (unit or "").strip()
                        })
                elif line.startswith("<"):
                    m = re.match(r'<(.*?)> (.*)', line)
                    if m:
                        rel, obj = m.groups()
                        entries.append({
                            "type": "relation",
                            "subject": current_node,
                            "name": rel.strip(),
                            "object": obj.strip()
                        })
    return entries

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
    Extract all ```cnl code blocks from the markdown text.
    Returns a list of code block strings (without ```cnl ... ``` markers).
    """
    pattern = r"```cnl(.*?)```"
    matches = re.findall(pattern, markdown, re.DOTALL | re.IGNORECASE)
    return [block.strip() for block in matches]

def parse_logical_cnl(text: str, log: Optional[List[str]] = None) -> List[Dict]:
    relation_types = load_schema("relation_types.yaml", default_data=[])
    attribute_types = load_schema("attribute_types.yaml", default_data=[])

    known_relations = {r["name"] for r in relation_types}
    known_attributes = {a["name"] for a in attribute_types}

    statements = []
    nodes_seen = set()

    clauses = re.split(r"[;\n]+", text)

    for idx, clause in enumerate(clauses):
        line = clause.strip()
        if not line or line.startswith("#"):
            continue

        # --- Relation: subject <relation> object ---
        m_rel = re.match(r"(.+?)\s*<(.+?)>\s*(.+)", line)
        if m_rel:
            subject, rel, obj = m_rel.groups()
            if rel in known_relations:
                subj_id = normalize_id(subject)
                obj_id = normalize_id(obj)

                # Add nodes if new
                for nid in (subj_id, obj_id):
                    if nid not in nodes_seen:
                        statements.append({"type": "node", "id": nid, "name": nid})
                        nodes_seen.add(nid)

                statements.append({
                    "type": "relation",
                    "subject": subj_id,
                    "object": obj_id,
                    "name": rel
                })
                continue

        # --- Attribute: subject has attr value unit ---
        m_attr1 = re.match(r"(.+?) has (\w+)(?: (.+?))(?: ([a-zA-Z]+))?$", line)
        if m_attr1:
            subj, attr, val, unit = m_attr1.groups()
            subj_id = normalize_id(subj)
            if attr in known_attributes:
                if subj_id not in nodes_seen:
                    statements.append({"type": "node", "id": subj_id, "name": subj_id})
                    nodes_seen.add(subj_id)
                statements.append({
                    "type": "attribute",
                    "target": subj_id,
                    "name": attr,
                    "value": val.strip(),
                    "unit": unit or ""
                })
                continue

        # --- Attribute: attr of subject is value unit ---
        m_attr2 = re.match(r"(\w+) of (.+?) is (.+?)(?: ([a-zA-Z]+))?$", line)
        if m_attr2:
            attr, subj, val, unit = m_attr2.groups()
            subj_id = normalize_id(subj)
            if attr in known_attributes:
                if subj_id not in nodes_seen:
                    statements.append({"type": "node", "id": subj_id, "name": subj_id})
                    nodes_seen.add(subj_id)
                statements.append({
                    "type": "attribute",
                    "target": subj_id,
                    "name": attr,
                    "value": val.strip(),
                    "unit": unit or ""
                })
                continue

        if log is not None:
            log.append(f"Unrecognized line {idx + 1}: {line.strip()}")

    return statements

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
        elif line_strip.startswith("```cnl"):
            in_cnl_block = True
        elif line_strip.startswith("```") and in_cnl_block:
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


