import os
import json
from fastapi import APIRouter, HTTPException, Query
from backend.core.models import Transition
from backend.core.registry import transition_registry_path, load_registry, save_registry
from datetime import datetime

router = APIRouter()

# ---------- Helper Functions ----------

def load_transition_registry(user_id: str):
    """Load transition registry, converting from old format if needed."""
    path = transition_registry_path(user_id)
    if not path.exists():
        return {}
    
    registry = load_registry(path)
    
    # If registry is a list (old format), convert to new format
    if isinstance(registry, list):
        new_registry = {}
        for transition in registry:
            transition_id = transition.get('id', 'unknown')
            new_registry[transition_id] = {
                **transition,
                'graphs': transition.get('graphs', [])
            }
        # Save the converted registry
        save_registry(path, new_registry)
        return new_registry
    
    return registry

def save_transition_registry(user_id: str, registry: dict):
    """Save transition registry."""
    path = transition_registry_path(user_id)
    save_registry(path, registry)

def update_transition_registry_entry(registry: dict, entry: dict, graph_id: str | None = None):
    """Update registry entry with proper graph tracking."""
    entry_id = entry.get("id")
    if not entry_id:
        raise ValueError("Entry must have an 'id' field")
    
    # Add graph tracking
    if graph_id:
        if 'graphs' not in entry:
            entry['graphs'] = []
        if graph_id not in entry['graphs']:
            entry['graphs'].append(graph_id)
    
    # Add timestamps
    now = datetime.utcnow().isoformat()
    if 'created_at' not in entry:
        entry['created_at'] = now
    entry['updated_at'] = now
    
    registry[entry_id] = entry
    return registry

def remove_transition_registry_entry(registry: dict, entry_id: str):
    """Remove entry from registry."""
    if entry_id in registry:
        del registry[entry_id]
    return registry

# ---------- Transition Routes with Registry ----------

@router.get("/users/{user_id}/transitions/{id}")
def get_transition(user_id: str, id: str):
    path = f"graph_data/users/{user_id}/transitions/{id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Transition not found")
    with open(path) as f:
        return json.load(f)

@router.post("/users/{user_id}/transitions/")
def create_transition(user_id: str, transition: Transition, graph_id: str = Query(None, description="Graph ID this transition belongs to")):
    tr_path = f"graph_data/users/{user_id}/transitions/{transition.id}.json"
    os.makedirs(os.path.dirname(tr_path), exist_ok=True)
    if os.path.exists(tr_path):
        raise HTTPException(status_code=400, detail="Transition already exists")
    with open(tr_path, "w") as f:
        json.dump(transition.dict(), f, indent=2)

    # Update registry with graph tracking
    registry = load_transition_registry(user_id)
    registry = update_transition_registry_entry(registry, transition.dict(), graph_id)
    save_transition_registry(user_id, registry)

    # Regenerate composed files if graph_id is provided
    if graph_id:
        try:
            from backend.routes.atomic_routes import force_regenerate_composed_files
            force_regenerate_composed_files(user_id, graph_id)
        except Exception as e:
            print(f"Warning: Failed to regenerate composed files after transition creation: {e}")

    return {"status": "Transition created and registered"}

@router.put("/users/{user_id}/transitions/{id}")
def update_transition(user_id: str, id: str, transition: Transition, graph_id: str = Query(None, description="Graph ID this transition belongs to")):
    tr_path = f"graph_data/users/{user_id}/transitions/{id}.json"
    if not os.path.exists(tr_path):
        raise HTTPException(status_code=404, detail="Transition not found")
    with open(tr_path, "w") as f:
        json.dump(transition.dict(), f, indent=2)

    # Update registry with graph tracking
    registry = load_transition_registry(user_id)
    registry = update_transition_registry_entry(registry, transition.dict(), graph_id)
    save_transition_registry(user_id, registry)

    # Regenerate composed files if graph_id is provided
    if graph_id:
        try:
            from backend.routes.atomic_routes import force_regenerate_composed_files
            force_regenerate_composed_files(user_id, graph_id)
        except Exception as e:
            print(f"Warning: Failed to regenerate composed files after transition update: {e}")

    return {"status": "Transition updated and registry synced"}

@router.delete("/users/{user_id}/transitions/{id}")
def delete_transition(user_id: str, id: str):
    tr_path = f"graph_data/users/{user_id}/transitions/{id}.json"
    if os.path.exists(tr_path):
        os.remove(tr_path)
        registry = load_transition_registry(user_id)
        registry = remove_transition_registry_entry(registry, id)
        save_transition_registry(user_id, registry)
        
        # Regenerate composed files for all graphs that had this transition
        try:
            from backend.routes.atomic_routes import force_regenerate_composed_files
            # Get the transition's graphs before deletion
            old_registry = load_transition_registry(user_id)
            if id in old_registry:
                for graph_id in old_registry[id].get('graphs', []):
                    try:
                        force_regenerate_composed_files(user_id, graph_id)
                    except Exception as e:
                        print(f"Warning: Failed to regenerate composed files for graph {graph_id} after transition deletion: {e}")
        except Exception as e:
            print(f"Warning: Failed to regenerate composed files after transition deletion: {e}")
        
        return {"status": "Transition deleted and registry updated"}
    raise HTTPException(status_code=404, detail="Transition not found")

@router.get("/users/{user_id}/transitions")
def list_transitions(user_id: str, graph_id: str = Query(None, description="Filter transitions by graph ID")):
    registry = load_transition_registry(user_id)
    if graph_id:
        # Filter by graph if specified
        return [
            transition for transition in registry.values()
            if graph_id in transition.get('graphs', [])
        ]
    else:
        # Return all transitions
        return list(registry.values())
