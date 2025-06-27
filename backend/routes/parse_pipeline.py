from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Dict, Any, Optional
import markdown
import yaml
import json
import re
import os
from core.models import AttributeNode, RelationNode
from routes.graph_ops import create_attribute_node, create_relation_node
from core.node_utils import (
    extract_base_name, extract_qualifier, extract_quantifier, compose_node_id, extract_node_name_as_is
)
from core.compose import compose_graph
from core.registry import make_attribute_id, make_relation_id
from routes.schema_routes import get_relation_types

router = APIRouter()

# --- Backend CRUD helpers for attributes and relations ---
def create_attribute_helper(user_id, graph_id, attr_dict, report):
    try:
        attr = AttributeNode(
            id=make_attribute_id(
                attr_dict['target_node'],
                attr_dict['attribute_name'],
                attr_dict.get('value', ''),
                attr_dict.get('unit', ''),
                attr_dict.get('adverb', ''),
                attr_dict.get('modality', '')
            ),
            source_id=attr_dict['target_node'],
            name=attr_dict['attribute_name'],
            value=attr_dict.get('value'),
            unit=attr_dict.get('unit'),
            adverb=attr_dict.get('adverb'),
            modality=attr_dict.get('modality'),
        )
        create_attribute_node(user_id, graph_id, attr)
    except Exception as e:
        report.append({'type': 'error', 'stage': 'create_attribute_helper', 'message': str(e), 'attr': attr_dict})

def create_relation_helper(user_id, graph_id, rel_dict, report):
    try:
        rel = RelationNode(
            id=make_relation_id(rel_dict['source_node'], rel_dict['relation_name'], rel_dict['target_node_id'], rel_dict.get('adverb', ''), rel_dict.get('modality', '')),
            source_id=rel_dict['source_node'],
            name=rel_dict['relation_name'],
            target_id=rel_dict['target_node_id'],
            adverb=rel_dict.get('adverb'),
            modality=rel_dict.get('modality'),
        )
        create_relation_node(user_id, graph_id, rel)
    except Exception as e:
        report.append({'type': 'error', 'stage': 'create_relation_helper', 'message': str(e), 'rel': rel_dict})

# --- Utility Functions (all local for now) ---

def load_cnl_markdown(file_content: str) -> bool:
    """Check if the CNL markdown file is valid (stub for now)."""
    return bool(file_content and file_content.strip())

def extract_sections(md_text: str) -> List[Dict[str, Any]]:
    """Extract markdown sections with their headings and content."""
    # Simple regex-based section splitter (can be improved)
    pattern = r'(^#+ .+\n(?:[^#].*\n?)*)'
    matches = re.findall(pattern, md_text, re.MULTILINE)
    sections = []
    for match in matches:
        lines = match.strip().split('\n')
        heading = lines[0].strip()
        content = '\n'.join(lines[1:]).strip()
        sections.append({'heading': heading, 'content': content})
    return sections

def extract_graph_description(md_text: str) -> str:
    """Extract free-floating text before the first heading as graph_description."""
    parts = re.split(r'^#+ ', md_text, maxsplit=1, flags=re.MULTILINE)
    if parts and parts[0].strip():
        return parts[0].strip()
    return ''

def extract_cnl_block(section_content: str) -> str:
    """Extracts the first :::cnl ... ::: block from section content, returns the inner text or empty string."""
    match = re.search(r':::cnl\s*(.*?)\s*:::', section_content, re.DOTALL)
    return match.group(1).strip() if match else ''

def extract_node_name_as_is(heading: str) -> str:
    """Extracts the node name as-is from a markdown heading (removes leading # and whitespace)."""
    return heading.lstrip('#').strip()

def extract_base_name(node_name: str) -> str:
    """Extracts the base name from a node name by removing all markdown markup (bold, italics, underline, modality, etc)."""
    # Remove bold (**text**), italics (*text*), underline (++text++), and [modality]
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

def compose_node_id(quantifier: str, qualifier: str, base_name: str, report: list = None) -> Optional[str]:
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

def extract_description(section_content: str) -> str:
    """Extracts description text from section content, excluding :::cnl ... ::: blocks. Preserves markdown markup and collapses multiple blank lines."""
    # Remove all :::cnl ... ::: blocks
    desc = re.sub(r':::cnl\s*.*?\s*:::', '', section_content, flags=re.DOTALL)
    # Collapse multiple blank lines into a single newline
    desc = re.sub(r'\n{2,}', '\n', desc)
    return desc.strip()

def update_node_list(node_list: list, node: dict) -> None:
    """Insert or replace node in node_list by node_id."""
    for i, n in enumerate(node_list):
        if n['node_id'] == node['node_id']:
            node_list[i] = node
            return
    node_list.append(node)

def save_section_node(user_id: str, node: dict, node_registry_path: str, report: list, graph_id: str = None) -> None:
    """If node_id not in node_registry, save node and update registry. 'graphs' should contain graph_id."""
    node_id = node['node_id']
    # Load or create node_registry
    try:
        if os.path.exists(node_registry_path):
            with open(node_registry_path, 'r') as f:
                node_registry = json.load(f)
        else:
            node_registry = {}
    except Exception as e:
        report.append({'type': 'error', 'stage': 'load_node_registry', 'message': str(e)})
        node_registry = {}
    # If node_id not in registry, add it
    if node_id not in node_registry:
        node_registry[node_id] = {
            'name': node['name'],
            'graphs': [graph_id] if graph_id else [],
            'created_at': '',  # Fill with timestamp if needed
            'updated_at': ''
        }
    else:
        # If already present, add graph_id if not present
        if graph_id and graph_id not in node_registry[node_id].get('graphs', []):
            node_registry[node_id]['graphs'].append(graph_id)
    # Save node file
    user_dir = os.path.join("graph_data", "users", user_id, "nodes")
    os.makedirs(user_dir, exist_ok=True)
    node_path = os.path.join(user_dir, f"{node_id}.json")
    try:
        with open(node_path, 'w') as f:
            json.dump(node, f, indent=2)
    except Exception as e:
        report.append({'type': 'error', 'stage': 'save_node', 'node_id': node_id, 'message': str(e)})
    # Update registry
    try:
        with open(node_registry_path, 'w') as f:
            json.dump(node_registry, f, indent=2)
    except Exception as e:
        report.append({'type': 'error', 'stage': 'update_node_registry', 'node_id': node_id, 'message': str(e)})

def extract_attributes_from_cnl_block(cnl_block: str, node_id: str, report: list) -> list:
    """Extracts attributes from a CNL block for a node. Value is plain, unit is in italics, adverb in underline, modality in []."""
    attributes = []
    for line in cnl_block.splitlines():
        line = line.strip()
        if not line or not line.startswith('has '):
            continue
        try:
            rest = line[4:].strip()
            if ':' not in rest:
                report.append({'type': 'error', 'stage': 'extract_attributes', 'message': f'Incomplete attribute line: {line}', 'node_id': node_id})
                continue
            att_name, value_part = rest.split(':', 1)
            att_name = att_name.strip()
            value_part = value_part.strip()
            if not att_name or not value_part:
                report.append({'type': 'error', 'stage': 'extract_attributes', 'message': f'Missing attribute name or value: {line}', 'node_id': node_id})
                continue
            import re
            # Extract adverb (e.g. ++rapidly++)
            adverb_match = re.search(r'\+\+([^+]+)\+\+', value_part)
            adverb = adverb_match.group(1) if adverb_match else ''
            value_wo_adverb = re.sub(r'\+\+[^+]+\+\+', '', value_part).strip()
            # Extract modality (e.g. [uncertain])
            modality_match = re.search(r'\[([^\]]+)\]', value_wo_adverb)
            modality = modality_match.group(1) if modality_match else ''
            value_wo_modality = re.sub(r'\[[^\]]+\]', '', value_wo_adverb).strip()
            # Extract unit (e.g. *million km²*)
            unit_match = re.search(r'\*([^*]+)\*', value_wo_modality)
            unit = unit_match.group(1) if unit_match else ''
            # Remove unit markup from value
            value_wo_unit = re.sub(r'\*[^*]+\*', '', value_wo_modality).strip()
            # The value is the remaining text (first word or number, or all if no markup)
            value_clean = value_wo_unit
            attributes.append({
                'target_node': node_id,
                'node_id': node_id,  # Add node_id for backend compatibility
                'attribute_name': att_name,
                'value': value_clean,
                'unit': unit,
                'adverb': adverb,
                'modality': modality
            })
        except Exception as e:
            report.append({'type': 'error', 'stage': 'extract_attributes', 'message': f'Exception: {str(e)}', 'node_id': node_id})
    return attributes

def normalize_relation_name(name):
    return name.lower().replace(' ', '_').strip()

def extract_relations_from_cnl_block(cnl_block: str, source_node: str, report: list, valid_relation_names=None, valid_relation_name_map=None) -> list:
    """Extracts relations from a CNL block for a node. Relation names must be in valid_relation_names if provided."""
    if valid_relation_names is None:
        valid_relation_names = set(["parent_of", "friend_of", "related_to"])  # Example default, replace with schema
    relations = []
    import re
    # --- Add: also return a set of role inferences for subject/target ---
    role_inferences = []  # (subject_id, target_id, subject_role, target_role)
    for line in cnl_block.splitlines():
        line = line.strip()
        if not line or line.startswith('has '):
            continue
        # Extract adverb (e.g. ++quickly++) at the start
        adverb = ''
        adverb_match = re.match(r'^\+\+([^+]+)\+\+\s*(.*)', line)
        if adverb_match:
            adverb = adverb_match.group(1).strip()
            line = adverb_match.group(2).strip()
        # Match <relation_name> target_node_markup [modality]
        m = re.match(r'<([^>]+)>\s+(.+)', line)
        if m:
            rel_name_raw = m.group(1).strip()
            rel_name_norm = normalize_relation_name(rel_name_raw)
            target_node_name = m.group(2).strip()
            # Extract modality (e.g. [uncertain]) at the end of target_node_name
            modality = ''
            modality_match = re.search(r'\[([^\]]+)\]\s*$', target_node_name)
            if modality_match:
                modality = modality_match.group(1).strip()
                target_node_name = re.sub(r'\s*\[[^\]]+\]\s*$', '', target_node_name).strip()
            if not rel_name_norm or not target_node_name:
                report.append({'type': 'error', 'stage': 'extract_relations', 'message': f'Incomplete relation line: {line}', 'source_node': source_node})
                continue
            if rel_name_norm not in valid_relation_names:
                report.append({'type': 'error', 'stage': 'extract_relations', 'message': f"Relation name '{rel_name_raw}' not found in schema.", 'suggest_create': {'type': 'relation', 'name': rel_name_raw}})
                continue
            schema_rel_name = valid_relation_name_map[rel_name_norm]
            target_base_name = extract_base_name(target_node_name)
            target_qualifier = extract_qualifier(target_node_name)
            target_quantifier = extract_quantifier(target_node_name)
            target_node_id = compose_node_id(target_quantifier, target_qualifier, target_base_name)
            # Skip this relation if target_node_id is None
            if not target_node_id:
                report.append({'type': 'error', 'stage': 'extract_relations', 'message': f'Could not compose target node ID for: {target_node_name}', 'source_node': source_node})
                continue
            # --- Role inference logic ---
            if rel_name_norm in {"member_of", "belongs_to", "element_of"}:
                role_inferences.append({
                    'subject_id': source_node,
                    'target_id': target_node_id,
                    'subject_role': 'individual',
                    'target_role': 'class'
                })
            relations.append({
                'relation_name': schema_rel_name,  # Use schema name for output
                'source_node': source_node,
                'target_node_name': target_node_name,
                'target_base_name': target_base_name,
                'target_qualifier': target_qualifier,
                'target_quantifier': target_quantifier,
                'target_node_id': target_node_id,
                'adverb': adverb,
                'modality': modality,
                # --- Add role inference info for pipeline ---
                'role_inference': role_inferences[-1] if role_inferences else None
            })
        else:
            report.append({'type': 'error', 'stage': 'extract_relations', 'message': f'Incomplete or malformed relation line: {line}', 'source_node': source_node})
    return relations

# --- Main Route ---

@router.post("/users/{user_id}/graphs/{graph_id}/parse_pipeline")
def parse_pipeline(
    user_id: str,
    graph_id: str,
    file: UploadFile = File(...)
):
    """
    Parse a CNL markdown file according to the pipeline logic.
    """
    report = []
    try:
        content = file.file.read().decode('utf-8')
    except Exception as e:
        report.append({'type': 'error', 'stage': 'load_cnl_md', 'message': f'File read error: {e}'})
        return {"success": False, "report": report}

    if not load_cnl_markdown(content):
        report.append({'type': 'error', 'stage': 'load_cnl_md', 'message': 'Invalid or empty CNL markdown file.'})
        return {"success": False, "report": report}

    graph_description = extract_graph_description(content)
    sections = extract_sections(content)

    node_list = []
    attribute_list = []
    relation_list = []

    # Load valid relation names from combined schemas (global + user)
    try:
        # Import the schema functions to get combined schemas
        relation_types = get_relation_types(user_id, graph_id)
        # Build a mapping: normalized_name -> original_name
        valid_relation_name_map = {normalize_relation_name(rt['name']): rt['name'] for rt in relation_types if 'name' in rt}
        valid_relation_names = set(valid_relation_name_map.keys())
    except Exception as e:
        report.append({'type': 'error', 'stage': 'load_relation_types', 'message': str(e)})
        valid_relation_name_map = {}
        valid_relation_names = set()

    # Define node_registry_path before the loop
    node_registry_path = os.path.join("graph_data", "users", user_id, "node_registry.json")

    for section in sections:
        heading = section['heading']
        node_name = extract_node_name_as_is(heading)
        base_name = extract_base_name(node_name)
        qualifier = extract_qualifier(node_name)
        quantifier = extract_quantifier(node_name)
        node_id = compose_node_id(quantifier, qualifier, base_name, report)
        if not node_id:
            continue  # Error already reported, skip this node
        # Extract description from section content
        description = extract_description(section['content'])
        node = {
            'node_id': node_id,
            'name': node_name,
            'base_name': base_name,
            'qualifier': qualifier,
            'quantifier': quantifier,
            'description': description,
            'attributes': [],
            'relations': []
        }
        # --- Parse CNL block for attributes and relations ---
        cnl_block = extract_cnl_block(section['content'])
        inferred_role = ''
        if cnl_block:
            # Attribute extraction
            attrs = extract_attributes_from_cnl_block(cnl_block, node_id, report)
            attribute_list.extend(attrs)
            node['attributes'].extend(attrs)
            # --- Use backend CRUD for attributes ---
            for attr in attrs:
                create_attribute_helper(user_id, graph_id, attr, report)
            # Relation extraction
            rels = extract_relations_from_cnl_block(cnl_block, node_id, report, valid_relation_names=valid_relation_names, valid_relation_name_map=valid_relation_name_map)
            relation_list.extend(rels)
            # --- Use backend CRUD for relations ---
            for rel in rels:
                create_relation_helper(user_id, graph_id, rel, report)
            # --- Set subject node's role if any relation infers it ---
            for rel in rels:
                role_inf = rel.get('role_inference')
                if role_inf and role_inf['subject_id'] == node_id:
                    inferred_role = role_inf['subject_role']
            if inferred_role:
                node['role'] = inferred_role
            # Save node first (attributes only)
            update_node_list(node_list, node)
            save_section_node(user_id, node, node_registry_path, report)
            # --- Remove manual relation file writes, as handled by backend CRUD ---
            # Ensure target nodes exist in node db, node_list, and node_registry
            user_nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
            for rel in rels:
                target_id = rel['target_node_id']
                target_node_path = os.path.join(user_nodes_dir, f"{target_id}.json")
                if target_id and not any(n['node_id'] == target_id for n in node_list):
                    # If the target node is not in node_list, add it (even if the file exists)
                    norm_target_id = normalize_relation_name(target_id)
                    inferred_role = None
                    for rel2 in rels:
                        if rel2.get('role_inference') and rel2['target_node_id'] == norm_target_id:
                            inferred_role = rel2['role_inference'].get('target_role')
                    target_node = {
                        'node_id': norm_target_id,
                        'name': rel['target_node_name'],
                        'base_name': rel['target_base_name'],
                        'qualifier': rel['target_qualifier'],
                        'quantifier': rel['target_quantifier'],
                        'role': inferred_role if inferred_role else '',
                        'description': '',
                        'attributes': [],
                        'relations': []
                    }
                    update_node_list(node_list, target_node)
                    save_section_node(user_id, target_node, node_registry_path, report)
        else:
            update_node_list(node_list, node)
            save_section_node(user_id, node, node_registry_path, report)
    # Deduplicate node_list by node_id (in case of accidental duplicates)
    seen_ids = set()
    deduped_node_list = []
    for node in node_list:
        if node['node_id'] not in seen_ids:
            deduped_node_list.append(node)
            seen_ids.add(node['node_id'])
    node_list = deduped_node_list

    # --- Persist all nodes (including relation targets) ---
    node_registry_path = os.path.join("graph_data", "users", user_id, "node_registry.json")
    for node in node_list:
        save_section_node(user_id, node, node_registry_path, report, graph_id)

    # --- Compose graph output ---
    # Convert report list to dict format expected by compose_graph
    report_dict = {"errors": report} if report else {}
    composed = compose_graph(user_id, graph_id, [n['node_id'] for n in node_list], graph_description, report_dict)
    composed_json_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id, "composed.json")
    composed_yaml_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id, "composed.yaml")
    result = {
        "success": True,
        "graph_description": graph_description,
        "sections": sections,
        "node_list": node_list,
        "attribute_list": attribute_list,
        "relation_list": relation_list,
        "report": report,
        'composed_json_path': composed_json_path,
        'composed_yaml_path': composed_yaml_path,
        'composed': composed["polymorphic"]  # Use polymorphic format for backward compatibility
    }
    return result
