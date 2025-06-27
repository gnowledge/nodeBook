import os
import json
import pytest
from core.schema_ops import (
    load_schema,
    save_schema,
    validate_schema_entry,
    ATTRIBUTE_TYPE_KEYS,
    RELATION_TYPE_KEYS,
    NODE_TYPE_KEYS,
    GLOBAL_SCHEMA_PATH,
)


SCHEMA_FILES = [
    ("attribute_types.json", ATTRIBUTE_TYPE_KEYS),
    ("relation_types.json", RELATION_TYPE_KEYS),
    ("node_types.yaml", NODE_TYPE_KEYS),  # Keep node_types.yaml if no node_types.json exists
]

@pytest.mark.parametrize("filename, key_order", SCHEMA_FILES)
def test_schema_loading_and_validation(filename, key_order):
    path = os.path.join(GLOBAL_SCHEMA_PATH, filename)
    assert os.path.exists(path), f"{filename} does not exist"

    data = load_schema(filename, default_data=[])
    assert isinstance(data, list), "Schema file should load as a list"

    for entry in data:
        validate_schema_entry(entry, key_order, filename)

@pytest.mark.parametrize("filename, key_order", SCHEMA_FILES)
def test_round_trip_safety(filename, key_order, tmp_path):
    # Load original
    data = load_schema(filename, default_data=[])

    # Validate entries
    for entry in data:
        validate_schema_entry(entry, key_order, filename)

    # Save to temp path
    temp_file = tmp_path / filename
    # If JSON, write as JSON
    if filename.endswith('.json'):
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, sort_keys=True)
        with open(temp_file, 'r', encoding='utf-8') as f:
            reloaded = json.load(f)
    else:
        save_schema(temp_file, data)
        reloaded = load_schema(temp_file, default_data=[])

    # Compare sorted by name for robustness
    def sort_by_name(lst):
        return sorted(lst, key=lambda x: x.get('name', ''))
    assert sort_by_name(data) == sort_by_name(reloaded), f"Round-trip mismatch in {filename}"


def test_validate_schema_entry_raises_on_missing_keys():
    entry = {
        "name": "area",
        "data_type": "float",
        # "description" is missing
        "unit": "km²"
    }
    required_keys = ["name", "data_type", "description", "unit"]

    with pytest.raises(ValueError) as excinfo:
        validate_schema_entry(entry, required_keys, "attribute_types.yaml")

    assert "Missing keys in attribute_types.yaml entry" in str(excinfo.value)
    assert "description" in str(excinfo.value)

