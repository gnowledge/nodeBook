from fastapi import APIRouter, HTTPException
import os
from core.id_utils import get_user_id

router = APIRouter()

GRAPH_ROOT = "graph_data"

# @router.get("/ndf/users/{user_id}/graphs")
# def list_graphs_for_user(user_id: str):
#     """
#     List all graphs for a given user.
#     Returns a list of graph folder names under graph_data/{user_id}/
#     """
#     user_path = os.path.join(GRAPH_ROOT, user_id)
#     if not os.path.exists(user_path):
#         return []
#     try:
#         from os import listdir
#         from os.path import isdir, join
#         folders = [
#             name for name in listdir(user_path)
#             if isdir(join(user_path, name)) and name != "global"
#         ]
#         return folders
#     except Exception as e:
#         # Log the error for debugging
#         print(f"Error listing graphs for user {user_id}: {e}")
#         return []

# Utility to get global attribute/relation types
@router.get("/global/types")
def get_global_types():
    import yaml
    global_path = os.path.join(GRAPH_ROOT, "global")
    attribute_types = []
    relation_types = []
    try:
        with open(os.path.join(global_path, "attribute_types.yaml"), encoding="utf-8") as f:
            attribute_types = yaml.safe_load(f) or []
    except Exception:
        pass
    try:
        with open(os.path.join(global_path, "relation_types.yaml"), encoding="utf-8") as f:
            relation_types = yaml.safe_load(f) or []
    except Exception:
        pass
    return {
        "attributeTypes": attribute_types,
        "relationTypes": relation_types
    }

# @router.post("/ndf/users/{user_id}/graphs/{graph_id}/create")
# def create_graph(graph_id: str):
#     path = os.path.join(GRAPH_ROOT, graph_id)
#     if os.path.exists(path):
#         raise HTTPException(status_code=400, detail="Graph already exists")
#     os.makedirs(path, exist_ok=True)
#     # Create a default node YAML file in the new graph directory
#     default_node_path = os.path.join(path, "defaultNode.yaml")
#     with open(default_node_path, "w", encoding="utf-8") as f:
#         f.write(
#             "node:\n"
#             "  id: defaultNode\n"
#             "  name: Default Node\n"
#             "  attributes: []\n"
#             "relations: []\n"
#         )
#     return {"message": "Graph created", "graph_id": graph_id}
