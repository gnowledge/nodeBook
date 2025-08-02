from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from backend.routes.users import users_router
import os
from pathlib import Path

from backend.routes import graph, nodes, graph_ops, schema_routes, graphs, ndf_routes, preferences, parse_pipeline, functions, transitions, atomic_routes, logging_routes, exchange, password_reset
from backend.core.schema_ops import ensure_schema_file
from backend.core.logging_system import get_logger
from backend.core.activity_middleware import get_activity_middleware
from dotenv import load_dotenv
load_dotenv("backend/.env")
# backend/app.py


app = FastAPI(title="NDF: Node-neighborhood Description Framework")

# Initialize logging system
logger = get_logger("system")
logger.system("NDF Studio backend starting up", event_type="startup")

# from backend.core.graph_state import populate_graph


# ✅ Apply CORS middleware once
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Apply activity tracking middleware for inactivity-based token expiration
app.add_middleware(
    get_activity_middleware([
        "/docs",
        "/redoc", 
        "/openapi.json",
        "/api/logs",  # Don't track log viewing as activity
        "/favicon.ico",
        "/static",
        "/health",
        "/api/health"
    ])
)

# ✅ Include all routers
app.include_router(users_router, prefix="/api/auth")
app.include_router(nodes.router, prefix="/api/ndf")
app.include_router(graph_ops.router, prefix="/api/ndf")
app.include_router(graph.router, prefix="/api/ndf")
app.include_router(schema_routes.router, prefix="/api/ndf")
app.include_router(graphs.router, prefix="/api/ndf")
app.include_router(ndf_routes.router, prefix="/api/ndf")
app.include_router(preferences.router, prefix="/api/ndf")
app.include_router(parse_pipeline.router, prefix="/api/ndf")
app.include_router(functions.router, prefix="/api/ndf")
app.include_router(transitions.router, prefix="/api/ndf")
app.include_router(atomic_routes.router, prefix="/api/ndf")
app.include_router(logging_routes.router)
app.include_router(exchange.router)
app.include_router(password_reset.password_reset_router, prefix="/api/auth")

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
