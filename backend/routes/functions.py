import os
import json
from fastapi import APIRouter, HTTPException
from backend.core.models import Function
from backend.core import dal

router = APIRouter()

# ---------- Helper Functions ----------

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
    try:
        return dal.read_function(user_id, id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Function not found")

@router.post("/users/{user_id}/functions/")
def create_function(user_id: str, fn: Function):
    try:
        dal.read_function(user_id, fn.id)
        raise HTTPException(status_code=400, detail="Function already exists")
    except FileNotFoundError:
        dal.create_function(user_id, fn.id, fn.dict())

    registry = dal.load_registry(user_id, "function")
    registry = update_registry_entry(registry, fn.dict())
    dal.save_registry(user_id, "function", registry)

    return {"status": "Function created and registered"}

@router.put("/users/{user_id}/functions/{id}")
def update_function(user_id: str, id: str, fn: Function):
    try:
        dal.read_function(user_id, id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Function not found")

    dal.update_function(user_id, id, fn.dict())

    registry = dal.load_registry(user_id, "function")
    registry = update_registry_entry(registry, fn.dict())
    dal.save_registry(user_id, "function", registry)

    return {"status": "Function updated and registry synced"}

@router.delete("/users/{user_id}/functions/{id}")
def delete_function(user_id: str, id: str):
    try:
        dal.read_function(user_id, id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Function not found")

    dal.delete_function(user_id, id)
    registry = dal.load_registry(user_id, "function")
    registry = remove_registry_entry(registry, id)
    dal.save_registry(user_id, "function", registry)
    return {"status": "Function deleted and registry updated"}

@router.get("/users/{user_id}/functions")
def list_functions(user_id: str):
    return dal.load_registry(user_id, "function")
