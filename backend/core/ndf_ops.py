from collections import defaultdict, OrderedDict
from core.cnl_parser import normalize_id
from typing import List, Dict, Optional

def merge_cnl_into_ndf(ndf_data: dict, parsed_statements: list[dict]) -> dict:
    """
    Merge parsed CNL statements into an existing .ndf structure.
    Modifies the `nodes` list in-place or creates it if missing.
    """
    if "nodes" not in ndf_data:
        ndf_data["nodes"] = []

    node_map = {n["id"]: n for n in ndf_data["nodes"]}

    for stmt in parsed_statements:
        if stmt["type"] == "node":
            node_id = stmt["id"]
            if node_id not in node_map:
                node_map[node_id] = {
                    "id": node_id,
                    "name": stmt["name"],
                    "is_a": stmt["is_a"],
                    "attributes": [],
                    "relations": [],
                }
            else:
                # Add missing is_a if not present
                if "is_a" not in node_map[node_id] and stmt.get("is_a"):
                    node_map[node_id]["is_a"] = stmt["is_a"]

        elif stmt["type"] == "attribute":
            node_id = stmt["target"]
            if node_id not in node_map:
                node_map[node_id] = {
                    "id": node_id,
                    "name": stmt["target"],
                    "attributes": [],
                    "relations": [],
                }
            attrs = node_map[node_id].setdefault("attributes", [])
            attrs.append(OrderedDict([
                ("name", stmt["name"]),
                ("value", stmt["value"]),
                ("unit", stmt["unit"]),
            ]))

        elif stmt["type"] == "relation":
            subj = stmt["subject"]
            if subj not in node_map:
                node_map[subj] = {
                    "id": subj,
                    "name": subj,
                    "attributes": [],
                    "relations": [],
                }
            rels = node_map[subj].setdefault("relations", [])
            rels.append(OrderedDict([
                ("name", stmt["name"]),
                ("object", stmt["object"]),
            ]))

    # Reassemble list of nodes in order
    ndf_data["nodes"] = list(node_map.values())
    return ndf_data

def convert_parsed_to_nodes(parsed: List[Dict]) -> List[Dict]:
    nodes_map = {}

    # First, collect nodes explicitly declared
    for stmt in parsed:
        if stmt["type"] == "node":
            nid = stmt["id"]
            nodes_map[nid] = {
                "id": nid,
                "name": stmt.get("name", nid),
                "description": stmt.get("description", ""),
                "attributes": [],
                "relations": []
            }

    # Ensure all subjects/targets in attributes/relations are nodes
    for stmt in parsed:
        if stmt["type"] == "attribute":
            target = stmt["target"]
            if target not in nodes_map:
                nodes_map[target] = {
                    "id": target,
                    "name": target,
                    "description": "",
                    "attributes": [],
                    "relations": []
                }
        elif stmt["type"] == "relation":
            for node_id in [stmt["subject"], stmt["object"]]:
                if node_id not in nodes_map:
                    nodes_map[node_id] = {
                        "id": node_id,
                        "name": node_id,
                        "description": "",
                        "attributes": [],
                        "relations": []
                    }

    # Attach attributes
    for stmt in parsed:
        if stmt["type"] == "attribute":
            attr = {
                "name": stmt["name"],
                "value": stmt["value"],
                "unit": stmt.get("unit", ""),
                "quantifier": stmt.get("quantifier", ""),
                "modality": stmt.get("modality", "")
            }
            nodes_map[stmt["target"]]["attributes"].append(attr)

    # Attach relations to subject node
    for stmt in parsed:
        if stmt["type"] == "relation":
            rel = {
                "name": stmt["name"],
                "target": stmt["object"],
                "subject_quantifier": stmt.get("subject_quantifier", ""),
                "object_quantifier": stmt.get("object_quantifier", ""),
                "modality": stmt.get("modality", "")
            }
            nodes_map[stmt["subject"]]["relations"].append(rel)

    return list(nodes_map.values())
