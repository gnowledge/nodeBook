import os
import json
from fastapi import APIRouter, HTTPException
from backend.core.models import Function

router = APIRouter()

# ---------- Helper Functions ----------

def load_registry(path):
    if not os.path.exists(path):
        return []
    with open(path) as f:
        return json.load(f)

def save_registry(path, data):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(data, f, indent=2)

def update_registry_entry(registry, entry):
    updated = False
    for i, r in enumerate(registry):
        if r["id"] == entry["id"]:
            registry[i] = entry
            updated = True
            break
    if not updated:
        registry.append(entry)
    return registry

def remove_registry_entry(registry, entry_id):
    return [r for r in registry if r["id"] != entry_id]

# ---------- Function Routes with Registry ----------

@router.get("/users/{user_id}/functions/{id}")
def get_function(user_id: str, id: str):
    path = f"graph_data/users/{user_id}/functions/{id}.json"
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Function not found")
    with open(path) as f:
        return json.load(f)

@router.post("/users/{user_id}/functions/")
def create_function(user_id: str, fn: Function):
    fn_path = f"graph_data/users/{user_id}/functions/{fn.id}.json"
    reg_path = f"graph_data/users/{user_id}/function_registry.json"
    os.makedirs(os.path.dirname(fn_path), exist_ok=True)
    if os.path.exists(fn_path):
        raise HTTPException(status_code=400, detail="Function already exists")
    with open(fn_path, "w") as f:
        json.dump(fn.dict(), f, indent=2)

    registry = load_registry(reg_path)
    registry = update_registry_entry(registry, fn.dict())
    save_registry(reg_path, registry)

    return {"status": "Function created and registered"}

@router.put("/users/{user_id}/functions/{id}")
def update_function(user_id: str, id: str, fn: Function):
    fn_path = f"graph_data/users/{user_id}/functions/{id}.json"
    reg_path = f"graph_data/users/{user_id}/function_registry.json"
    if not os.path.exists(fn_path):
        raise HTTPException(status_code=404, detail="Function not found")
    with open(fn_path, "w") as f:
        json.dump(fn.dict(), f, indent=2)

    registry = load_registry(reg_path)
    registry = update_registry_entry(registry, fn.dict())
    save_registry(reg_path, registry)

    return {"status": "Function updated and registry synced"}

@router.delete("/users/{user_id}/functions/{id}")
def delete_function(user_id: str, id: str):
    fn_path = f"graph_data/users/{user_id}/functions/{id}.json"
    reg_path = f"graph_data/users/{user_id}/function_registry.json"
    if os.path.exists(fn_path):
        os.remove(fn_path)
        registry = load_registry(reg_path)
        registry = remove_registry_entry(registry, id)
        save_registry(reg_path, registry)
        return {"status": "Function deleted and registry updated"}
    raise HTTPException(status_code=404, detail="Function not found")

@router.get("/users/{user_id}/functions")
def list_functions(user_id: str):
    reg_path = f"graph_data/users/{user_id}/function_registry.json"
    return load_registry(reg_path)