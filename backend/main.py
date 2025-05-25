from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import yaml

from routes import graph, nodes, graph_ops, schema_routes, graphs

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
app.include_router(nodes.router, prefix="/api")
app.include_router(graph_ops.router, prefix="/api")
app.include_router(graph.router, prefix="/api")
app.include_router(schema_routes.router, prefix="/api")
app.include_router(graphs.router, prefix="/api")

# ✅ Health check route
@app.get("/api/health")
def health_check():
    return {"status": "ok"}

# ✅ Create graph data directory
os.makedirs("graph_data", exist_ok=True)

# ✅ YAML-based NodeType CRUD (kept inline for now)
router = APIRouter()
NODE_TYPES_FILE = "schema/node_types.yaml"

class NodeType(BaseModel):
    name: str
    description: str


# Mount custom node-type YAML router
app.include_router(router, prefix="/api")

# Double-check that you do not have another route (in any router) that matches
# /api/users/{user_id}/graphs/{graph_id}/graph, which could shadow or override this one.
