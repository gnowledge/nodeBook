from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List, Dict, Any, Optional
import markdown
import yaml
import json
import re
import os

router = APIRouter()

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
    for line in cnl_block.splitlines():
        line = line.strip()
        if not line:
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
            relations.append({
                'relation_name': schema_rel_name,  # Use schema name for output
                'source_node': source_node,
                'target_node_name': target_node_name,
                'target_base_name': target_base_name,
                'target_qualifier': target_qualifier,
                'target_quantifier': target_quantifier,
                'target_node_id': target_node_id,
                'adverb': adverb,
                'modality': modality
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

    # Load valid relation names from global relation_types.json
    relation_types_path = os.path.join("graph_data", "global", "relation_types.json")
    try:
        with open(relation_types_path, 'r') as f:
            relation_types = json.load(f)
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
        if cnl_block:
            # Attribute extraction
            attrs = extract_attributes_from_cnl_block(cnl_block, node_id, report)
            attribute_list.extend(attrs)
            node['attributes'].extend(attrs)
            # Relation extraction
            rels = extract_relations_from_cnl_block(cnl_block, node_id, report, valid_relation_names=valid_relation_names, valid_relation_name_map=valid_relation_name_map)
            relation_list.extend(rels)
            # Save node first (attributes only)
            update_node_list(node_list, node)
            save_section_node(user_id, node, node_registry_path, report)
            # Now append relations directly to node_id.json
            user_nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
            node_path = os.path.join(user_nodes_dir, f"{node_id}.json")
            try:
                with open(node_path, 'r') as f:
                    node_json = json.load(f)
                # Overwrite relations with deduplicated new set
                new_relations = []
                seen_rel = set()
                for rel in rels:
                    rel_tuple = (
                        rel['relation_name'], node_id, rel['target_node_id'],
                        rel['target_qualifier'], rel['target_quantifier'], rel.get('modality', ''), rel.get('adverb', '')
                    )
                    if rel_tuple not in seen_rel:
                        new_relations.append({
                            'name': rel['relation_name'],
                            'source': node_id,
                            'target': rel['target_node_id'],
                            'target_name': rel['target_node_name'],
                            'target_qualifier': rel['target_qualifier'],
                            'target_quantifier': rel['target_quantifier'],
                            'adverb': rel.get('adverb', ''),
                            'modality': rel.get('modality', ''),
                        })
                        seen_rel.add(rel_tuple)
                node_json['relations'] = new_relations
                with open(node_path, 'w') as f:
                    json.dump(node_json, f, indent=2)
                # Update in-memory node_list with new relations
                for i, n in enumerate(node_list):
                    if n['node_id'] == node_id:
                        node_list[i]['relations'] = new_relations
                        break
                # Ensure target nodes exist in node db, node_list, and node_registry
                for rel in rels:
                    target_id = rel['target_node_id']
                    target_node_path = os.path.join(user_nodes_dir, f"{target_id}.json")
                    if target_id and not any(n['node_id'] == target_id for n in node_list) and not os.path.exists(target_node_path):
                        # Normalize target_id for node_id and base_name
                        norm_target_id = normalize_relation_name(target_id)
                        target_node = {
                            'node_id': norm_target_id,
                            'name': rel['target_node_name'],
                            'base_name': rel['target_base_name'],
                            'qualifier': rel['target_qualifier'],
                            'quantifier': rel['target_quantifier'],
                            'description': '',
                            'attributes': [],
                            'relations': []
                        }
                        try:
                            with open(os.path.join(user_nodes_dir, f"{norm_target_id}.json"), 'w') as f:
                                json.dump(target_node, f, indent=2)
                        except Exception as e:
                            report.append({'type': 'error', 'stage': 'save_target_node', 'node_id': norm_target_id, 'message': str(e)})
                        # Also add to node_list and node_registry
                        update_node_list(node_list, target_node)
                        save_section_node(user_id, target_node, node_registry_path, report)
            except Exception as e:
                report.append({'type': 'error', 'stage': 'append_relations_to_node', 'node_id': node_id, 'message': str(e)})
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
    composed = {}
    if graph_description:
        composed['graph_description'] = graph_description
    composed['nodes'] = []
    user_nodes_dir = os.path.join("graph_data", "users", user_id, "nodes")
    composed_node_ids = set()
    # First, add all nodes in node_list
    for node in node_list:
        node_path = os.path.join(user_nodes_dir, f"{node['node_id']}.json")
        try:
            with open(node_path, 'r') as f:
                node_json = json.load(f)
            composed['nodes'].append(node_json)
            composed_node_ids.add(node['node_id'])
        except Exception as e:
            report.append({'type': 'error', 'stage': 'compose_graph', 'node_id': node['node_id'], 'message': str(e)})
    # Now, ensure all relation targets are included
    for node in composed['nodes']:
        for rel in node.get('relations', []):
            target_id = rel.get('target')
            if target_id and target_id not in composed_node_ids:
                target_node_path = os.path.join(user_nodes_dir, f"{target_id}.json")
                try:
                    with open(target_node_path, 'r') as f:
                        target_node_json = json.load(f)
                    composed['nodes'].append(target_node_json)
                    composed_node_ids.add(target_id)
                except Exception as e:
                    report.append({'type': 'error', 'stage': 'compose_graph', 'node_id': target_id, 'message': f'Could not load target node for relation: {str(e)}'})

    # Save composed.json and composed.yaml in the graph directory (where cnl.md is)
    composed_json_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id, "composed.json")
    composed_yaml_path = os.path.join("graph_data", "users", user_id, "graphs", graph_id, "composed.yaml")
    try:
        with open(composed_json_path, 'w') as f:
            json.dump(composed, f, indent=2)
    except Exception as e:
        report.append({'type': 'error', 'stage': 'save_composed_json', 'message': str(e)})
    try:
        with open(composed_yaml_path, 'w') as f:
            yaml.dump(composed, f, sort_keys=False, allow_unicode=True)
    except Exception as e:
        report.append({'type': 'error', 'stage': 'save_composed_yaml', 'message': str(e)})
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
        'composed': composed
    }
    return result
