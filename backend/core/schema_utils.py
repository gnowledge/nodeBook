import yaml
from pathlib import Path

def filter_used_schema(parsed_yaml_path, relation_schema_path, attribute_schema_path, output_path):
    """
    Filters only the used relation and attribute types from the global schema
    and writes them into used_schema.yaml.
    """
    # Load parsed graph
    parsed_data = yaml.safe_load(Path(parsed_yaml_path).read_text())

    # Collect used relation and attribute names
    used_relation_names = set()
    used_attribute_names = set()

    for node in parsed_data.get("nodes", []):
        for rel in node.get("relations", []):
            used_relation_names.add(rel["name"])
        for attr in node.get("attributes", []):
            used_attribute_names.add(attr["name"])

    # Load global schemas
    global_relations = yaml.safe_load(Path(relation_schema_path).read_text())
    global_attributes = yaml.safe_load(Path(attribute_schema_path).read_text())

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
        yaml.dump(used_schema, f, sort_keys=False)

    return used_schema
