import os
import yaml

GRAPH_DATA_PATH = "graph_data"

def ensure_schema_file(file_name, default_data):
    file_path = os.path.join(GRAPH_DATA_PATH, file_name)
    if not os.path.exists(file_path):
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(default_data, f)
    return file_path

def load_schema(file_name, default_data):
    file_path = ensure_schema_file(file_name, default_data)
    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data or default_data

def save_schema(file_name, data):
    file_path = os.path.join(GRAPH_DATA_PATH, file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        yaml.dump(data, f)

def load_schema_yaml(file_name: str, default_data: list):
    file_path = ensure_schema_file(file_name, default_data)
    with open(file_path, encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if data is None:
        with open(file_path, "w", encoding="utf-8") as f:
            yaml.dump(default_data, f)
        return default_data
    return data

        
