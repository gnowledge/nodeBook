import os
import json
from fastapi import APIRouter, HTTPException
from core.models import Transition

router = APIRouter()

# ---------- Helper Functions ----------

def load_registry(path):
    if not os.path.exists(path):
        return []
    try:
        with open(path) as f:
            data = json.load(f)
            # Ensure we always return a list
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # If it's a dict, convert to list with the dict as an item
                return [data]
            else:
                # If it's neither list nor dict, return empty list
                return []
    except (json.JSONDecodeError, IOError):
        # If there's any error reading the file, return empty list
        return []

def save_registry(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def update_registry_entry(registry, entry):
    # Ensure registry is a list
    if not isinstance(registry, list):
        registry = []
    
    # Ensure entry is a dict
    if not isinstance(entry, dict):
        raise ValueError("Entry must be a dictionary")
    
    updated = False
    for i, r in enumerate(registry):
        if isinstance(r, dict) and r.get("id") == entry.get("id"):
            registry[i] = entry
            updated = True
            break
    if not updated:
        registry.append(entry)
    return registry

def remove_registry_entry(registry, entry_id):
    return [r for r in registry if r["id"] != entry_id]

# ---------- Transition Routes with Registry ----------

@router.get("/users/{user_id}/transitions/{id}")
def get_transition(user_id: str, id: str):
    path = f"graph_data/users/{user_id}/transitions/{id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Transition not found")
    with open(path) as f:
        return json.load(f)

@router.post("/users/{user_id}/transitions/")
def create_transition(user_id: str, transition: Transition):
    tr_path = f"graph_data/users/{user_id}/transitions/{transition.id}.json"
    reg_path = f"graph_data/users/{user_id}/transition_registry.json"
    os.makedirs(os.path.dirname(tr_path), exist_ok=True)
    if os.path.exists(tr_path):
        raise HTTPException(status_code=400, detail="Transition already exists")
    with open(tr_path, "w") as f:
        json.dump(transition.dict(), f, indent=2)

    registry = load_registry(reg_path)
    registry = update_registry_entry(registry, transition.dict())
    save_registry(reg_path, registry)

    return {"status": "Transition created and registered"}

@router.put("/users/{user_id}/transitions/{id}")
def update_transition(user_id: str, id: str, transition: Transition):
    tr_path = f"graph_data/users/{user_id}/transitions/{id}.json"
    reg_path = f"graph_data/users/{user_id}/transition_registry.json"
    if not os.path.exists(tr_path):
        raise HTTPException(status_code=404, detail="Transition not found")
    with open(tr_path, "w") as f:
        json.dump(transition.dict(), f, indent=2)

    registry = load_registry(reg_path)
    registry = update_registry_entry(registry, transition.dict())
    save_registry(reg_path, registry)

    return {"status": "Transition updated and registry synced"}

@router.delete("/users/{user_id}/transitions/{id}")
def delete_transition(user_id: str, id: str):
    tr_path = f"graph_data/users/{user_id}/transitions/{id}.json"
    reg_path = f"graph_data/users/{user_id}/transition_registry.json"
    if os.path.exists(tr_path):
        os.remove(tr_path)
        registry = load_registry(reg_path)
        registry = remove_registry_entry(registry, id)
        save_registry(reg_path, registry)
        return {"status": "Transition deleted and registry updated"}
    raise HTTPException(status_code=404, detail="Transition not found")

@router.get("/users/{user_id}/transitions")
def list_transitions(user_id: str):
    reg_path = f"graph_data/users/{user_id}/transition_registry.json"
    return load_registry(reg_path)
