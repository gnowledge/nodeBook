import os
import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from backend.core import dal

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

@router.get("/preferences")
async def get_preferences(request: Request, user_id: str = None):
    # Prefer user_id from query param, fallback to header, then default
    user_id = user_id or request.headers.get("x-user-id", "user0")
    try:
        prefs = dal.read_preferences(user_id)
    except FileNotFoundError:
        prefs = DEFAULT_PREFERENCES.copy()
    return JSONResponse(content=prefs)

@router.post("/preferences")
async def set_preferences(request: Request, user_id: str = None):
    user_id = user_id or request.headers.get("x-user-id", "user0")
    data = await request.json()
    dal.save_preferences(user_id, data)
    return {"status": "ok"}
