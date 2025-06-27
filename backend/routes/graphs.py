from fastapi import APIRouter, HTTPException
import os
from core.id_utils import get_user_id

router = APIRouter()

GRAPH_ROOT = "graph_data"

# Removed /global/types route as it is now obsolete and replaced by schema_routes.py endpoints.

