import os
import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse

PREFERENCES_FILENAME = "preferences.json"
USERS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "graph_data", "users")

# Default preferences (should match frontend)
DEFAULT_PREFERENCES = {
    "graphLayout": "dagre",
    "language": "en",
    "educationLevel": "undergraduate",
    "landingTab": "help",
    "difficulty": "easy",
    "subjectOrder": "SVO",
    "theme": "system",
    "fontSize": "medium",
    "showTooltips": True,
    "autosave": False,
    "showScorecardOnSave": True,
    "showAdvanced": False,
    "accessibility": False,
}

router = APIRouter()

def get_user_dir(user_id):
    return os.path.join(USERS_DIR, user_id)

def get_preferences_path(user_id):
    return os.path.join(get_user_dir(user_id), PREFERENCES_FILENAME)

@router.get("/preferences")
async def get_preferences(request: Request, user_id: str = None):
    # Prefer user_id from query param, fallback to header, then default
    user_id = user_id or request.headers.get("x-user-id", "user0")
    pref_path = get_preferences_path(user_id)
    if os.path.exists(pref_path):
        with open(pref_path, "r") as f:
            prefs = json.load(f)
    else:
        prefs = DEFAULT_PREFERENCES.copy()
    return JSONResponse(content=prefs)

@router.post("/preferences")
async def set_preferences(request: Request, user_id: str = None):
    user_id = user_id or request.headers.get("x-user-id", "user0")
    data = await request.json()
    user_dir = get_user_dir(user_id)
    os.makedirs(user_dir, exist_ok=True)
    pref_path = get_preferences_path(user_id)
    with open(pref_path, "w") as f:
        json.dump(data, f, indent=2)
    return {"status": "ok"}
