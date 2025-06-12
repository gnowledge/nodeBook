import os
import json
import tempfile
import shutil
from backend.routes.parse_pipeline import update_node_list, save_section_node

def test_save_section_node_creates_node_json():
    # Setup temp user dir and registry
    temp_dir = tempfile.mkdtemp()
    user_id = 'testuser'
    node_registry_path = os.path.join(temp_dir, 'node_registry.json')
    node = {
        'node_id': 'some_big_apple',
        'name': '**Big** *some* Apple',
        'base_name': 'Apple',
        'qualifier': 'Big',
        'quantifier': 'some',
        'description': 'A test apple node.'
    }
    report = []
    # Patch user_dir in save_section_node to use temp_dir
    orig_os_makedirs = os.makedirs
    orig_os_path_join = os.path.join
    def fake_makedirs(path, exist_ok=False):
        if path.startswith('/graph_data/users/'):
            path = path.replace('/graph_data/users/', temp_dir + '/')
        orig_os_makedirs(path, exist_ok=exist_ok)
    def fake_path_join(a, *p):
        if a.startswith('/graph_data/users/'):
            a = a.replace('/graph_data/users/', temp_dir + '/')
        return orig_os_path_join(a, *p)
    os.makedirs = fake_makedirs
    os.path.join = fake_path_join
    try:
        save_section_node(user_id, node, node_registry_path, report)
        # Check node file
        node_path = os.path.join(temp_dir, user_id, 'nodes', f"{node['node_id']}.json")
        assert os.path.exists(node_path)
        with open(node_path) as f:
            node_json = json.load(f)
        assert node_json['node_id'] == node['node_id']
        assert node_json['name'] == node['name']
        assert node_json['base_name'] == node['base_name']
        assert node_json['qualifier'] == node['qualifier']
        assert node_json['quantifier'] == node['quantifier']
        assert node_json['description'] == node['description']
    finally:
        os.makedirs = orig_os_makedirs
        os.path.join = orig_os_path_join
        shutil.rmtree(temp_dir)
