from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import yaml

from routes import nodes, graph_ops, schema_routes, graph
from routes.nbh import router as nbh_router
app = FastAPI(title="NDF: Node-neighborhood Description Framework")
from core.graph_state import populate_graph
populate_graph()



# ✅ Apply CORS middleware once
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ Include all routers
#app.include_router(schema.router, prefix="/api")
#app.include_router(node_types.router, prefix="/api")
#app.include_router(attribute_types.router, prefix="/api")
#app.include_router(relation_types.router, prefix="/api")
app.include_router(nodes.router, prefix="/api")
app.include_router(graph_ops.router, prefix="/api")
app.include_router(nbh_router, prefix="/api/nbh")
app.include_router(graph.router, prefix="/api")
app.include_router(schema_routes.router, prefix="/api")

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

# def load_node_types():
#     if not os.path.exists(NODE_TYPES_FILE):
#         return []
#     with open(NODE_TYPES_FILE, encoding="utf-8") as f:
#         return yaml.safe_load(f) or []

# def save_node_types(data):
#     with open(NODE_TYPES_FILE, "w", encoding="utf-8") as f:
#         yaml.dump(data, f, allow_unicode=True, sort_keys=False)

# @router.get("/node-types")
# def list_node_types():
#     return load_node_types()

# @router.post("/node-types")
# def create_node_type(item: NodeType):
#     data = load_node_types()
#     if any(x["name"] == item.name for x in data):
#         raise HTTPException(status_code=400, detail="NodeType already exists")
#     data.append(item.dict())
#     save_node_types(data)
#     return {"status": "success"}

# @router.put("/node-types/{name}")
# def update_node_type(name: str, item: NodeType):
#     data = load_node_types()
#     for i, x in enumerate(data):
#         if x["name"] == name:
#             data[i] = item.dict()
#             save_node_types(data)
#             return {"status": "updated"}
#     raise HTTPException(status_code=404, detail="NodeType not found")

# @router.delete("/node-types/{name}")
# def delete_node_type(name: str):
#     data = load_node_types()
#     filtered = [x for x in data if x["name"] != name]
#     if len(filtered) == len(data):
#         raise HTTPException(status_code=404, detail="NodeType not found")
#     save_node_types(filtered)
#     return {"status": "deleted"}

# Mount custom node-type YAML router
app.include_router(router, prefix="/api")
