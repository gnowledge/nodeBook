from fastapi import APIRouter, HTTPException
import os
from backend.core.id_utils import get_user_id

router = APIRouter()

GRAPH_ROOT = "graph_data"


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

