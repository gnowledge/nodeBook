from collections import defaultdict

def organize_nbh(parsed):
    # Map each node id to its base data
    node_map = {}
    nbh_map = defaultdict(lambda: {"attributes": [], "relations": []})

    for stmt in parsed:
        if stmt["type"] == "node":
            node_map[stmt["id"]] = stmt

        elif stmt["type"] == "attribute":
            target = stmt["target"]
            attr = {
                "name": stmt["name"],
                "value": stmt["value"],
                "unit": stmt.get("unit", ""),
                "quantifier": stmt.get("quantifier", ""),
                "modality": stmt.get("modality", "")
            }
            nbh_map[target]["attributes"].append(attr)

        elif stmt["type"] == "relation":
            source = stmt["subject"]
            rel = {
                "name": stmt["name"],
                "target": stmt["object"],
                "subject_quantifier": stmt.get("subject_quantifier", ""),
                "object_quantifier": stmt.get("object_quantifier", ""),
                "modality": stmt.get("modality", "")
            }
            nbh_map[source]["relations"].append(rel)

    # Merge neighborhood info into each node
    for node_id, node in node_map.items():
        if node_id in nbh_map:
            node["attributes"] = nbh_map[node_id]["attributes"]
            node["relations"] = nbh_map[node_id]["relations"]

    return list(node_map.values())
