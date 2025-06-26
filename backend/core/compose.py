from pathlib import Path
import yaml
import os
import json
from typing import Optional

from backend.core.utils import load_json_file, save_json_file
from backend.core.node_ops import load_node
from backend.core.registry import load_registry, relation_registry_path, attribute_registry_path

def load_transitions(user_id: str) -> list:
    """Load all transitions for a user."""
    transitions_path = Path(f"graph_data/users/{user_id}/transition_registry.json")
    if transitions_path.exists():
        with open(transitions_path) as f:
            return json.load(f)
    return []

def compose_graph(user_id: str, graph_id: str, node_list: list, graph_description: Optional[str] = None, report: Optional[dict] = None) -> dict:
    """
    Compose the graph from node files and registries, and write composed.json (Cytoscape format),
    composed.yaml, and polymorphic_composed.json (rich PolyNode format).
    Args:
        user_id: The user ID.
        graph_id: The graph ID.
        node_list: List of node IDs to include.
        graph_description: Optional description for the graph.
        report: Optional report dict to include.
    Returns:
        The composed graph dict.
    """
    composed_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.json")
    composed_yaml_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/composed.yaml")
    poly_path = Path(f"graph_data/users/{user_id}/graphs/{graph_id}/polymorphic_composed.json")

    # Load nodes
    nodes = []
    for node_id in node_list:
        try:
            node_data = load_node(user_id, graph_id, node_id)
            nodes.append(node_data)
        except Exception as e:
            print(f"⚠️ Warning: node '{node_id}' not found or failed to load: {e}. Skipping.")

    # Load registries for fallback
    relations = list(load_registry(relation_registry_path(user_id)).values())
    attributes = list(load_registry(attribute_registry_path(user_id)).values())
    
    # Load transitions
    transitions = load_transitions(user_id)

    # Embed relations into each node (legacy fallback)
    node_id_to_node = {n["node_id"]: n for n in nodes if "node_id" in n}
    for rel in relations:
        source_id = rel.get("source")
        if source_id in node_id_to_node:
            node_id_to_node[source_id].setdefault("relations", []).append(rel)

    # --- Compose Cytoscape format ---
    cy_nodes = []
    cy_edges = []
    value_node_ids = set()
    transition_node_ids = set()
    
    for node in nodes:
        node_id = node.get("id") or node.get("node_id")
        label = node.get("name", node_id)
        cy_nodes.append({"data": {"id": node_id, "label": label}})
        
        # Handle PolyNode with morphs and nbh
        morphs = node.get("morphs")
        nbh = node.get("nbh")
        
        if morphs and nbh:
            # Find the active morph (neighborhood)
            active_morph = next((m for m in morphs if m.get("morph_id") == nbh), None)
            if active_morph:
                # Process RelationNode edges from active morph
                for rel_id in active_morph.get("relationNode_ids", []):
                    rel_path = f"graph_data/users/{user_id}/relationNodes/{rel_id}.json"
                    if os.path.exists(rel_path):
                        with open(rel_path) as f:
                            rel = json.load(f)
                        cy_edges.append({
                            "data": {
                                "id": rel["id"],
                                "source": rel["source_id"],
                                "target": rel["target_id"],
                                "label": rel["name"],
                                "type": "relation"
                            }
                        })
                
                # Process AttributeNode edges from active morph
                for attr_id in active_morph.get("attributeNode_ids", []):
                    attr_path = f"graph_data/users/{user_id}/attributeNodes/{attr_id}.json"
                    if os.path.exists(attr_path):
                        with open(attr_path) as f:
                            attr = json.load(f)
                        value_node_id = f"attrval_{attr['id']}"
                        # Add value node if not already present
                        if value_node_id not in value_node_ids:
                            # Create a more descriptive label for the value node
                            value_label = str(attr["value"])
                            if attr.get("unit"):
                                value_label += f" {attr['unit']}"
                            if attr.get("adverb"):
                                value_label = f"{attr['adverb']} {value_label}"
                            
                            cy_nodes.append({
                                "data": {
                                    "id": value_node_id,
                                    "label": value_label,
                                    "type": "attribute_value"
                                }
                            })
                            value_node_ids.add(value_node_id)
                        cy_edges.append({
                            "data": {
                                "id": attr["id"],
                                "source": attr["source_id"],
                                "target": value_node_id,
                                "label": f"has {attr['name']}",
                                "type": "attribute"
                            }
                        })
        
        # Legacy fallback: direct relations in node
        elif node.get("relations"):
            for rel in node["relations"]:
                cy_edges.append({
                    "data": {
                        "id": rel.get("id", f"{node_id}_{rel.get('name','rel')}_{rel.get('target','tgt')}") ,
                        "source": rel.get("source", node_id),
                        "target": rel.get("target"),
                        "label": rel.get("name"),
                        "type": "relation"
                    }
                })

    # Add transition nodes and edges
    for transition in transitions:
        transition_node_id = f"transition_{transition['id']}"
        if transition_node_id not in transition_node_ids:
            # Create transition node
            transition_label = transition.get('name', transition['id'])
            if transition.get('adjective'):
                transition_label = f"{transition['adjective']} {transition_label}"
            
            cy_nodes.append({
                "data": {
                    "id": transition_node_id,
                    "label": transition_label,
                    "type": "transition",
                    "tense": transition.get('tense', 'present'),
                    "description": transition.get('description', '')
                }
            })
            transition_node_ids.add(transition_node_id)
        
        # Add edges from inputs to transition
        for input_node in transition.get('inputs', []):
            input_id = input_node.get('id')
            if input_id:
                cy_edges.append({
                    "data": {
                        "id": f"input_{transition['id']}_{input_id}",
                        "source": input_id,
                        "target": transition_node_id,
                        "label": "input",
                        "type": "transition_input"
                    }
                })
        
        # Add edges from transition to outputs
        for output_node in transition.get('outputs', []):
            output_id = output_node.get('id')
            if output_id:
                cy_edges.append({
                    "data": {
                        "id": f"output_{transition['id']}_{output_id}",
                        "source": transition_node_id,
                        "target": output_id,
                        "label": "output",
                        "type": "transition_output"
                    }
                })

    cytoscape_graph = {"nodes": cy_nodes, "edges": cy_edges}
    save_json_file(composed_path, cytoscape_graph)
    with open(composed_yaml_path, "w") as f:
        yaml.safe_dump(cytoscape_graph, f, sort_keys=False, allow_unicode=True)

    # --- Compose polymorphic_composed.json ---
    # Collect all relationNodes and attributeNodes referenced by any morph
    relation_nodes = {}
    attribute_nodes = {}
    
    for node in nodes:
        morphs = node.get("morphs")
        if morphs:
            for morph in morphs:
                # Load RelationNodes from morph
                for rel_id in morph.get("relationNode_ids", []):
                    rel_path = f"graph_data/users/{user_id}/relationNodes/{rel_id}.json"
                    if os.path.exists(rel_path):
                        with open(rel_path) as f:
                            rel = json.load(f)
                        relation_nodes[rel_id] = rel
                
                # Load AttributeNodes from morph
                for attr_id in morph.get("attributeNode_ids", []):
                    attr_path = f"graph_data/users/{user_id}/attributeNodes/{attr_id}.json"
                    if os.path.exists(attr_path):
                        with open(attr_path) as f:
                            attr = json.load(f)
                        attribute_nodes[attr_id] = attr
    
    polymorphic = {
        "nodes": nodes,  # Changed from "polynodes" to "nodes" for consistency
        "relations": list(relation_nodes.values()),
        "attributes": list(attribute_nodes.values()),
        "transitions": transitions,  # Add transitions to polymorphic output
        "graph_id": graph_id,
        "description": graph_description or ""
    }
    save_json_file(poly_path, polymorphic)

    # For backward compatibility, return both formats
    return {
        "cytoscape": cytoscape_graph,
        "polymorphic": polymorphic
    }
