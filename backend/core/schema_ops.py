import os
import json
import re
from collections import OrderedDict
from pathlib import Path

ATTRIBUTE_TYPE_KEYS = ["name", "data_type", "description", "allowed_values", "unit"]
RELATION_TYPE_KEYS = ["name", "inverse_name", "description", "domain", "range"]
NODE_TYPE_KEYS = ["name", "description", "parent_types"]


GLOBAL_SCHEMA_PATH = "graph_data/global"

def ordered_schema_dict(entry: dict, key_order: list[str]) -> OrderedDict:
    ordered = OrderedDict()
    for key in key_order:
        if key in entry:
            ordered[key] = entry[key]
    for key in entry:
        if key not in ordered:
            ordered[key] = entry[key]
    return ordered


def ensure_schema_file(file_name, default_data):
    file_path = os.path.join(GLOBAL_SCHEMA_PATH, file_name)
    if not os.path.exists(file_path):
        os.makedirs(GLOBAL_SCHEMA_PATH, exist_ok=True)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
    return file_path

def load_schema(file_name, default_data):
    file_path = ensure_schema_file(file_name, default_data)
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)
    return data or default_data

def validate_schema_entry(entry: dict, required_keys: list[str], file_name: str) -> None:
    missing = [key for key in required_keys if key not in entry]
    if missing:
        raise ValueError(f"Missing keys in {file_name} entry: {missing} → {entry}")

def save_schema(file_name, data: list[dict]):
    file_path = os.path.join(GLOBAL_SCHEMA_PATH, file_name)

    # Choose key order based on file
    file_str = str(file_name)
    if "attribute" in file_str:
        key_order = ATTRIBUTE_TYPE_KEYS
    elif "relation" in file_str:
        key_order = RELATION_TYPE_KEYS
    elif "node" in file_str:
        key_order = NODE_TYPE_KEYS
    else:
        key_order = []


    formatted = []
    for entry in sorted(data, key=lambda x: x.get("name", "")):
        validate_schema_entry(entry, key_order, file_name)
        formatted.append(ordered_schema_dict(entry, key_order))

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(formatted, f, indent=2)

def load_schema_json(file_name: str, default_data: list):
    file_path = ensure_schema_file(file_name, default_data)
    with open(file_path, encoding="utf-8") as f:
        data = json.load(f)
    if data is None:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(default_data, f, indent=2)
        return default_data
    return data


def create_attribute_type_from_dict(data: dict):
    attr_types = load_schema("attribute_types.json", default_data=[])
    existing_names = {a["name"] for a in attr_types}
    if data["name"] in existing_names:
        return  # or raise or skip silently

    attr_types.append(OrderedDict([
        ("name", data["name"]),
        ("data_type", data["data_type"]),
        ("unit", data["unit"]),
        ("applicable_classes", data["applicable_classes"]),
    ]))
    save_schema("attribute_types.json", attr_types)


def create_relation_type_from_dict(data: dict):
    rel_types = load_schema("relation_types.json", default_data=[])
    existing_names = {r["name"] for r in rel_types}
    if data["name"] in existing_names:
        return

    rel_types.append(OrderedDict([
        ("name", data["name"]),
        ("inverse", data["inverse"]),
        ("domain", data["domain"]),
        ("range", data["range"]),
    ]))
    save_schema("relation_types.json", rel_types)


def parse_cnl_block(block: str) -> list[dict]:
    lines = block.strip().splitlines()
    statements = []
    for line in lines:
        line = line.strip()

        # --- Define attribute ---
        if line.lower().startswith("define attribute"):
            m = re.match(
                r"define attribute '(.+?)' as a (\w+)(?: with unit '(.+?)')?(?: applicable to (.+?))?\.", line)
            if m:
                name, data_type, unit, classes = m.groups()
                statements.append({
                    "type": "define_attribute",
                    "name": name,
                    "data_type": data_type,
                    "unit": unit or "",
                    "applicable_classes": [c.strip(" '") for c in classes.split(",")] if classes else []
                })

        # --- Define relation ---
        elif line.lower().startswith("define relation"):
            m = re.match(
                r"define relation '(.+?)' with inverse '(.+?)'(?: between '(.+?)' and '(.+?)')?\.", line)
            if m:
                name, inverse, domain, range_ = m.groups()
                statements.append({
                    "type": "define_relation",
                    "name": name,
                    "inverse": inverse,
                    "domain": domain,
                    "range": range_,
                })

        # [existing parsing continues...]
    return statements
    
def filter_used_schema(parsed_json_path, relation_schema_path, attribute_schema_path, output_path):
    """
    Filters only the used relation and attribute types from the global schema
    and writes them into used_schema.json.
    """
    # Load parsed graph
    with open(parsed_json_path, 'r') as f:
        parsed_data = json.load(f)

    # Collect used relation and attribute names
    used_relation_names = set()
    used_attribute_names = set()

    for node in parsed_data.get("nodes", []):
        for rel in node.get("relations", []):
            used_relation_names.add(rel["name"])
        for attr in node.get("attributes", []):
            used_attribute_names.add(attr["name"])

    # Load global schemas
    with open(relation_schema_path, 'r') as f:
        global_relations = json.load(f)
    with open(attribute_schema_path, 'r') as f:
        global_attributes = json.load(f)

    # Filter schemas
    used_relations = [r for r in global_relations if r["name"] in used_relation_names]
    used_attributes = [a for a in global_attributes if a["name"] in used_attribute_names]

    # Compose output
    used_schema = {
        "relation_types": used_relations,
        "attribute_types": used_attributes
    }

    # Write to file
    with open(output_path, "w") as f:
        json.dump(used_schema, f, indent=2, sort_keys=False)

    return used_schema
