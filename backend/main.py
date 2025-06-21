from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.users import users_router
import os
from pathlib import Path

from backend.routes import graph, nodes, graph_ops, schema_routes, graphs, ndf_routes, preferences, parse_pipeline, functions, transitions
from backend.core.schema_ops import ensure_schema_file
# backend/app.py


app = FastAPI(title="NDF: Node-neighborhood Description Framework")

# from core.graph_state import populate_graph


# ✅ Apply CORS middleware once
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include all routers
app.include_router(users_router, prefix="/auth")
app.include_router(nodes.router, prefix="/api")
app.include_router(graph_ops.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(schema_routes.router, prefix="/api")
app.include_router(graphs.router, prefix="/api")
app.include_router(ndf_routes.router, prefix="/api")
app.include_router(preferences.router, prefix="/api")
app.include_router(parse_pipeline.router, prefix="/api")
app.include_router(functions.router, prefix="/api")
app.include_router(transitions.router, prefix="/api")



# ✅ Health check route
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# ✅ Create graph data directory
os.makedirs("graph_data", exist_ok=True)

# Initialize global schema files with default data
def initialize_global_schemas():
    """Initialize global schema files with default data if they don't exist."""
    
    # Check if the global directory exists and has the basic schema files
    global_dir = Path("graph_data/global")
    if not global_dir.exists():
        print("[INFO] Creating global schema directory...")
        global_dir.mkdir(parents=True, exist_ok=True)
    
    # Only create default files if they don't already exist
    # This preserves existing schema files that may have been contributed by others
    
    # Check for transition_types.json - create if missing
    if not (global_dir / "transition_types.json").exists():
        print("[INFO] Creating default transition_types.json...")
        default_transition_types = [
            {
                "name": "transform",
                "description": "Transform one entity into another",
                "inputs": ["individual"],
                "outputs": ["individual"]
            },
            {
                "name": "create",
                "description": "Create a new entity",
                "inputs": [],
                "outputs": ["individual"]
            }
        ]
        ensure_schema_file("transition_types.json", default_transition_types)
    
    # Check for function_types.json - create if missing
    if not (global_dir / "function_types.json").exists():
        print("[INFO] Creating default function_types.json...")
        default_function_types = [
            {
                "name": "calculate",
                "description": "Perform a calculation",
                "inputs": ["number", "number"],
                "outputs": ["number"]
            }
        ]
        ensure_schema_file("function_types.json", default_function_types)
    
    print("[INFO] Global schemas initialized. Using existing schema files from graph_data/global/")

# Initialize schemas on startup
initialize_global_schemas()
