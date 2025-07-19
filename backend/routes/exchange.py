from fastapi import APIRouter, HTTPException, Response, UploadFile, File
from fastapi.responses import FileResponse
import os
import tempfile
import shutil
from typing import List, Tuple
import glob
import json
import socket
from datetime import datetime
import zipfile
from pathlib import Path
import time

router = APIRouter()

def get_graph_folder(user_id: str, graph_id: str) -> str:
    """
    Returns the absolute path to the graph's folder for the given user and graph.
    """
    # Use the data root from config for consistent path resolution
    from ..config import get_data_root
    data_root = get_data_root()
    graph_folder = data_root / 'users' / user_id / 'graphs' / graph_id
    graph_folder = graph_folder.resolve()
    
    if not graph_folder.is_dir():
        raise FileNotFoundError(f"Graph folder not found: {graph_folder}")
    return str(graph_folder)

def list_graph_files(graph_folder: str) -> list:
    """
    Recursively lists all files in the graph folder.
    Returns a list of absolute file paths.
    """
    file_list = []
    for root, dirs, files in os.walk(graph_folder):
        for file in files:
            file_list.append(os.path.join(root, file))
    return file_list

def create_manifest(user_id: str, graph_id: str, files: list, temp_folder: str) -> Tuple[dict, str]:
    """
    Compose a manifest dictionary with export metadata, graph info, provenance, and included files.
    Write manifest.json to temp_folder. Return (manifest_dict, manifest_path).
    """
    # Try to get graph name/title from metadata.yaml or composed.yaml if available
    graph_name = graph_id
    metadata_path = os.path.join(temp_folder, "metadata.yaml")
    if os.path.isfile(metadata_path):
        try:
            import yaml
            with open(metadata_path, "r") as f:
                meta = yaml.safe_load(f)
                if isinstance(meta, dict) and "title" in meta:
                    graph_name = meta["title"]
        except Exception:
            pass
    
    # Get current timestamp
    current_time = datetime.utcnow().isoformat() + "Z"
    
    # Compose manifest
    manifest = {
        "exported_at": current_time,
        "exported_by": user_id,
        "graph_id": graph_id,
        "graph_name": graph_name,
        "source_host": socket.gethostname(),
        "file_count": len(files),
        "files": [os.path.relpath(f, temp_folder) for f in files],
        "mimetype": "application/x-ndf",
        "recommended_application": "NodeBook",
        "provenance": {
            "created_by": user_id,
            "exported_by": user_id,
            "exported_at": current_time
        },
        "manifest_version": 1
    }
    manifest_path = os.path.join(temp_folder, "manifest.json")
    with open(manifest_path, "w") as mf:
        json.dump(manifest, mf, indent=2)
    return manifest, manifest_path

def zip_folder(temp_folder: str, output_path: str) -> str:
    """
    Zip the entire temp_folder into output_path. Returns the path to the .ndf file.
    The ZIP will contain the temp_folder directory itself as the root.
    """
    with zipfile.ZipFile(output_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        temp_folder_path = Path(temp_folder)
        for root, dirs, files in os.walk(temp_folder):
            for file in files:
                abs_path = os.path.join(root, file)
                # Include the temp_folder directory name in the ZIP
                rel_path = os.path.relpath(abs_path, temp_folder_path.parent)
                zipf.write(abs_path, rel_path)
    return output_path

def add_magic_number(ndf_path: str) -> str:
    """
    Add the NDFX magic number at the start of the .ndf file.
    """
    # Read the zip file
    with open(ndf_path, 'rb') as f:
        zip_content = f.read()
    
    # Create new file with magic number + zip content
    with open(ndf_path, 'wb') as f:
        f.write(b'NDFX')  # Magic number
        f.write(zip_content)
    
    return ndf_path

def create_temp_export_folder() -> str:
    """
    Create and return a path to a temporary directory for the export process.
    """
    temp_dir = tempfile.mkdtemp(prefix="ndf_export_")
    return temp_dir

def cleanup_temp_folder(temp_folder: str) -> None:
    """
    Clean up the temporary export folder.
    """
    try:
        if os.path.exists(temp_folder):
            shutil.rmtree(temp_folder)
            print(f"Cleaned up temp folder: {temp_folder}")
    except Exception as e:
        print(f"Warning: Failed to cleanup temp folder {temp_folder}: {e}")

def get_used_node_types(composed_data: dict) -> list:
    """
    Extract used node types from polymorphic_composed.json.
    Returns a list of node type definitions.
    """
    used_types = []
    nodes = composed_data.get("nodes", [])
    
    for node in nodes:
        if isinstance(node, dict):
            role = node.get("role")
            if role and role not in [t.get("name") for t in used_types]:
                used_types.append({
                    "name": role,
                    "description": f"Node type used by {node.get('name', 'unknown')}",
                    "parent_types": []
                })
    
    return used_types

def get_used_attribute_types(composed_data: dict) -> list:
    """
    Extract used attribute types from polymorphic_composed.json.
    Returns a list of attribute type definitions.
    """
    used_types = []
    attributes = composed_data.get("attributes", [])
    
    for attr in attributes:
        if isinstance(attr, dict):
            attr_name = attr.get("name")
            if attr_name and attr_name not in [t.get("name") for t in used_types]:
                used_types.append({
                    "name": attr_name,
                    "description": f"Attribute type used in the graph",
                    "data_type": "string",  # Default, could be enhanced
                    "unit": attr.get("unit")
                })
    
    return used_types

def get_used_relation_types(composed_data: dict) -> list:
    """
    Extract used relation types from polymorphic_composed.json.
    Returns a list of relation type definitions.
    """
    used_types = []
    relations = composed_data.get("relations", [])
    
    for rel in relations:
        if isinstance(rel, dict):
            rel_name = rel.get("name")
            if rel_name and rel_name not in [t.get("name") for t in used_types]:
                used_types.append({
                    "name": rel_name,
                    "description": f"Relation type used in the graph",
                    "symmetric": False,  # Default, could be enhanced
                    "transitive": False,  # Default, could be enhanced
                    "domain": [],
                    "range": []
                })
    
    return used_types

def create_schema_files(composed_data: dict, graph_data_dir: Path) -> list:
    """
    Create schema files with used types and return list of created file paths.
    Schema files are created in graph_data/schema/ directory.
    """
    created_files = []
    schema_dir = graph_data_dir / "schema"
    schema_dir.mkdir(parents=True, exist_ok=True)
    
    # Create node types file
    node_types = get_used_node_types(composed_data)
    if node_types:
        node_types_path = schema_dir / "node_types.json"
        with open(node_types_path, 'w') as f:
            json.dump(node_types, f, indent=2)
        created_files.append(str(node_types_path))
        print(f"Created node types file with {len(node_types)} types")
    
    # Create attribute types file
    attribute_types = get_used_attribute_types(composed_data)
    if attribute_types:
        attribute_types_path = schema_dir / "attribute_types.json"
        with open(attribute_types_path, 'w') as f:
            json.dump(attribute_types, f, indent=2)
        created_files.append(str(attribute_types_path))
        print(f"Created attribute types file with {len(attribute_types)} types")
    
    # Create relation types file
    relation_types = get_used_relation_types(composed_data)
    if relation_types:
        relation_types_path = schema_dir / "relation_types.json"
        with open(relation_types_path, 'w') as f:
            json.dump(relation_types, f, indent=2)
        created_files.append(str(relation_types_path))
        print(f"Created relation types file with {len(relation_types)} types")
    
    return created_files

@router.post("/api/exchange/export_ndf/{user_id}/{graph_id}")
def export_ndf(user_id: str, graph_id: str):
    """
    Export the specified graph as a .ndf compressed file, including all necessary files for import.
    """
    temp_folder = None
    try:
        # 1. Get graph folder and create temp export folder
        graph_folder = get_graph_folder(user_id, graph_id)
        temp_folder = create_temp_export_folder()
        
        # 2. Create the main export directory with graph name
        export_dir = Path(temp_folder) / graph_id
        export_dir.mkdir(parents=True, exist_ok=True)
        
        # Create graph_data subdirectory inside the graph directory
        graph_data_dir = export_dir / "graph_data"
        graph_data_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"Export directory created at: {export_dir}")
        print(f"Graph data directory created at: {graph_data_dir}")
        
        # 3. Copy all graph files to the graph_data subdirectory
        graph_files = list_graph_files(graph_folder)
        copied_files = []
        
        print(f"[DEBUG] Found {len(graph_files)} graph files to copy")
        print(f"[DEBUG] Graph folder: {graph_folder}")
        print(f"[DEBUG] Graph data directory: {graph_data_dir}")
        
        for file_path in graph_files:
            file_path = Path(file_path)
            print(f"[DEBUG] Processing file: {file_path}")
            
            # Skip empty template files
            if file_path.name == "CNL.md":
                # Check if file is empty or just template content
                try:
                    with open(file_path, 'r') as f:
                        content = f.read().strip()
                    if not content or len(content) < 10:  # Skip if empty or very short
                        print(f"Skipping empty template file: {file_path.name}")
                        continue
                except Exception:
                    continue
            
            rel_path = file_path.relative_to(graph_folder)
            dest_path = graph_data_dir / rel_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, dest_path)
            copied_files.append(str(dest_path))
            print(f"[DEBUG] Copied {file_path} to {dest_path}")
        
        print(f"Copied {len(copied_files)} graph files to graph_data/")
        
        # Verify graph_data directory exists and has files
        print(f"[DEBUG] Graph data directory exists: {graph_data_dir.exists()}")
        if graph_data_dir.exists():
            print(f"[DEBUG] Contents of graph_data directory:")
            for item in graph_data_dir.iterdir():
                print(f"[DEBUG]   {item.name} ({'dir' if item.is_dir() else 'file'})")
        else:
            print(f"[DEBUG] Graph data directory does not exist!")
        
        # 4. Create schema files from polymorphic_composed.json
        polymorphic_path = graph_data_dir / "polymorphic_composed.json"
        if polymorphic_path.exists():
            try:
                with open(polymorphic_path, 'r') as f:
                    composed_data = json.load(f)
                
                schema_files = create_schema_files(composed_data, graph_data_dir)
                copied_files.extend(schema_files)
                print(f"Created {len(schema_files)} schema files in graph_data/schema/")
            except Exception as e:
                print(f"Warning: Could not create schema files: {e}")
        else:
            print("Warning: polymorphic_composed.json not found, skipping schema creation")
        
        # 5. Create manifest at the root level
        manifest, manifest_path = create_manifest(user_id, graph_id, copied_files, str(export_dir))
        print(f"Manifest created at: {manifest_path}")
        
        # Add manifest to the list of files (but don't include in copied_files for manifest creation)
        print(f"Added manifest to export files")
        
        # 6. Create the .ndf file
        ndf_path = os.path.join(tempfile.gettempdir(), f"{graph_id}.ndf")
        
        # Debug: Show what we're about to zip
        print(f"[DEBUG] About to zip directory: {export_dir}")
        print(f"[DEBUG] Export directory exists: {export_dir.exists()}")
        print(f"[DEBUG] Contents of export directory before zipping:")
        for item in export_dir.iterdir():
            print(f"[DEBUG]   {item.name} ({'dir' if item.is_dir() else 'file'})")
        
        # Zip the export_dir (which contains the graph directory)
        zip_folder(str(export_dir), ndf_path)
        add_magic_number(ndf_path)
        print(f"NDF file created at: {ndf_path}")

        # 7. Return the .ndf file as a download
        filename = f"{graph_id}.ndf"
        return FileResponse(ndf_path, media_type="application/x-ndf", filename=filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {e}")
    finally:
        # 8. Clean up temp folder
        if temp_folder:
            cleanup_temp_folder(temp_folder) 

@router.post("/api/exchange/import_ndf/{user_id}")
async def import_ndf(user_id: str, file: UploadFile = File(...)):
    """
    Import a .ndf file into the user's workspace.
    """
    temp_folder = None
    try:
        # 1. Validate file type
        if not file.filename or not file.filename.endswith('.ndf'):
            raise HTTPException(status_code=400, detail="File must be a .ndf file")
        
        # 2. Create temporary directory for extraction
        temp_folder = create_temp_export_folder()
        ndf_path = os.path.join(temp_folder, file.filename or "import.ndf")
        
        # 3. Save uploaded file
        with open(ndf_path, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # 4. Validate magic number and extract
        with open(ndf_path, 'rb') as f:
            magic = f.read(4)
            if magic != b'NDFX':
                raise HTTPException(status_code=400, detail="Invalid .ndf file format")
        
        # 5. Extract ZIP content (skip magic number)
        import zipfile
        with zipfile.ZipFile(ndf_path, 'r') as zipf:
            print(f"[DEBUG] ZIP file contents:")
            for info in zipf.infolist():
                print(f"[DEBUG]   {info.filename} ({'dir' if info.is_dir() else 'file'})")
            zipf.extractall(temp_folder)
        
        # 6. Find the graph directory
        extracted_dir = Path(temp_folder)
        print(f"[DEBUG] Extracted directory: {extracted_dir}")
        print(f"[DEBUG] Contents of extracted directory:")
        for item in extracted_dir.iterdir():
            print(f"[DEBUG]   {item.name} ({'dir' if item.is_dir() else 'file'})")
        
        graph_dirs = [d for d in extracted_dir.iterdir() if d.is_dir() and d.name != '__pycache__']
        if not graph_dirs:
            raise HTTPException(status_code=400, detail="No graph directory found in .ndf file")
        
        graph_dir = graph_dirs[0]
        graph_id = graph_dir.name
        print(f"[DEBUG] Found graph directory: {graph_dir}")
        print(f"[DEBUG] Contents of graph directory:")
        for item in graph_dir.iterdir():
            print(f"[DEBUG]   {item.name} ({'dir' if item.is_dir() else 'file'})")
        
        # 7. Read manifest (manifest is inside the graph directory)
        manifest_path = graph_dir / "manifest.json"
        if not manifest_path.exists():
            raise HTTPException(status_code=400, detail="Manifest not found in .ndf file")
        
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
        
        print(f"[DEBUG] Manifest loaded successfully")
        
        # 8. Import the graph
        result = import_graph_from_ndf(user_id, graph_dir, manifest)
        
        return {
            "status": "success",
            "message": f"Graph '{graph_id}' imported successfully",
            "imported_graph_id": result["graph_id"],
            "imported_files": result["imported_files"],
            "imported_types": result["imported_types"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Import failed: {e}")
    finally:
        if temp_folder:
            cleanup_temp_folder(temp_folder)

def import_graph_from_ndf(user_id: str, graph_dir: Path, manifest: dict) -> dict:
    """
    Import graph from extracted .ndf directory.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    graph_id = graph_dir.name
    graph_data_dir = graph_dir / "graph_data"
    
    if not graph_data_dir.exists():
        raise ValueError("graph_data directory not found")
    
    # 1. Copy graph_data files (except schema)
    imported_files = []
    graph_files = []
    
    for file_path in graph_data_dir.rglob("*"):
        if file_path.is_file() and "schema" not in file_path.parts:
            # Copy to user's graph directory
            rel_path = file_path.relative_to(graph_data_dir)
            dest_path = data_root / "users" / user_id / "graphs" / graph_id / rel_path
            dest_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, dest_path)
            graph_files.append(str(dest_path))
            imported_files.append(str(rel_path))
    
    # 2. Import schema files
    schema_dir = graph_data_dir / "schema"
    imported_types = {"nodes": 0, "attributes": 0, "relations": 0}
    
    if schema_dir.exists():
        imported_types = import_schema_files(user_id, schema_dir)
    
    # 3. Import graph components (nodes, relations, attributes, transitions)
    polymorphic_path = data_root / "users" / user_id / "graphs" / graph_id / "polymorphic_composed.json"
    if polymorphic_path.exists():
        with open(polymorphic_path, 'r') as f:
            composed_data = json.load(f)
        
        import_graph_components(user_id, graph_id, composed_data)
    
    return {
        "graph_id": graph_id,
        "imported_files": imported_files,
        "imported_types": imported_types
    }

def import_schema_files(user_id: str, schema_dir: Path) -> dict:
    """
    Import schema files and merge with existing schemas.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    imported_types = {"nodes": 0, "attributes": 0, "relations": 0}
    
    # Import node types
    node_types_path = schema_dir / "node_types.json"
    if node_types_path.exists():
        with open(node_types_path, 'r') as f:
            new_node_types = json.load(f)
        
        # Load existing node types
        existing_path = data_root / "global" / "node_types.json"
        existing_types = []
        if existing_path.exists():
            with open(existing_path, 'r') as f:
                existing_types = json.load(f)
        
        # Merge types (avoid duplicates)
        existing_names = {t.get("name") for t in existing_types}
        for new_type in new_node_types:
            if new_type.get("name") not in existing_names:
                existing_types.append(new_type)
                imported_types["nodes"] += 1
        
        # Save merged types
        with open(existing_path, 'w') as f:
            json.dump(existing_types, f, indent=2)
    
    # Import attribute types
    attr_types_path = schema_dir / "attribute_types.json"
    if attr_types_path.exists():
        with open(attr_types_path, 'r') as f:
            new_attr_types = json.load(f)
        
        existing_path = data_root / "global" / "attribute_types.json"
        existing_types = []
        if existing_path.exists():
            with open(existing_path, 'r') as f:
                existing_types = json.load(f)
        
        existing_names = {t.get("name") for t in existing_types}
        for new_type in new_attr_types:
            if new_type.get("name") not in existing_names:
                existing_types.append(new_type)
                imported_types["attributes"] += 1
        
        with open(existing_path, 'w') as f:
            json.dump(existing_types, f, indent=2)
    
    # Import relation types
    rel_types_path = schema_dir / "relation_types.json"
    if rel_types_path.exists():
        with open(rel_types_path, 'r') as f:
            new_rel_types = json.load(f)
        
        existing_path = data_root / "global" / "relation_types.json"
        existing_types = []
        if existing_path.exists():
            with open(existing_path, 'r') as f:
                existing_types = json.load(f)
        
        existing_names = {t.get("name") for t in existing_types}
        for new_type in new_rel_types:
            if new_type.get("name") not in existing_names:
                existing_types.append(new_type)
                imported_types["relations"] += 1
        
        with open(existing_path, 'w') as f:
            json.dump(existing_types, f, indent=2)
    
    return imported_types

def import_graph_components(user_id: str, graph_id: str, composed_data: dict):
    """
    Import graph components and update registries.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    
    # Import nodes
    nodes = composed_data.get("nodes", [])
    for node in nodes:
        if isinstance(node, dict):
            node_id = node.get("id")
            if node_id:
                # Save node file
                node_path = data_root / "users" / user_id / "nodes" / f"{node_id}.json"
                node_path.parent.mkdir(parents=True, exist_ok=True)
                with open(node_path, 'w') as f:
                    json.dump(node, f, indent=2)
                
                # Update node registry
                update_node_registry(user_id, node_id, node, graph_id)
    
    # Import relations
    relations = composed_data.get("relations", [])
    for rel in relations:
        if isinstance(rel, dict):
            rel_id = rel.get("id")
            if rel_id:
                # Save relation file
                rel_path = data_root / "users" / user_id / "relationNodes" / f"{rel_id}.json"
                rel_path.parent.mkdir(parents=True, exist_ok=True)
                with open(rel_path, 'w') as f:
                    json.dump(rel, f, indent=2)
                
                # Update relation registry
                update_relation_registry(user_id, rel_id, rel, graph_id)
    
    # Import attributes
    attributes = composed_data.get("attributes", [])
    for attr in attributes:
        if isinstance(attr, dict):
            attr_id = attr.get("id")
            if attr_id:
                # Save attribute file
                attr_path = data_root / "users" / user_id / "attributeNodes" / f"{attr_id}.json"
                attr_path.parent.mkdir(parents=True, exist_ok=True)
                with open(attr_path, 'w') as f:
                    json.dump(attr, f, indent=2)
                
                # Update attribute registry
                update_attribute_registry(user_id, attr_id, attr, graph_id)
    
    # Import transitions
    transitions = composed_data.get("transitions", [])
    for trans in transitions:
        if isinstance(trans, dict):
            trans_id = trans.get("id")
            if trans_id:
                # Save transition file
                trans_path = data_root / "users" / user_id / "transitions" / f"{trans_id}.json"
                trans_path.parent.mkdir(parents=True, exist_ok=True)
                with open(trans_path, 'w') as f:
                    json.dump(trans, f, indent=2)
                
                # Update transition registry
                update_transition_registry(user_id, trans_id, trans, graph_id)

def update_node_registry(user_id: str, node_id: str, node_data: dict, graph_id: str):
    """
    Update node registry with imported node.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    registry_path = data_root / "users" / user_id / "node_registry.json"
    
    # Load existing registry
    registry = {}
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            registry = json.load(f)
    
    # Update or add node
    if node_id in registry:
        # Add graph to existing node's graphs list
        if "graphs" not in registry[node_id]:
            registry[node_id]["graphs"] = []
        if graph_id not in registry[node_id]["graphs"]:
            registry[node_id]["graphs"].append(graph_id)
    else:
        # Create new registry entry
        registry[node_id] = {
            "name": node_data.get("name", node_id),
            "role": node_data.get("role", "individual"),
            "graphs": [graph_id],
            "created_at": time.time(),
            "updated_at": time.time()
        }
    
    # Save registry
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)

def update_relation_registry(user_id: str, rel_id: str, rel_data: dict, graph_id: str):
    """
    Update relation registry with imported relation.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    registry_path = data_root / "users" / user_id / "relation_registry.json"
    
    # Load existing registry
    registry = {}
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            registry = json.load(f)
    
    # Update or add relation
    if rel_id in registry:
        if "graphs" not in registry[rel_id]:
            registry[rel_id]["graphs"] = []
        if graph_id not in registry[rel_id]["graphs"]:
            registry[rel_id]["graphs"].append(graph_id)
    else:
        registry[rel_id] = {
            "name": rel_data.get("name", rel_id),
            "graphs": [graph_id],
            "created_at": time.time(),
            "updated_at": time.time()
        }
    
    # Save registry
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)

def update_attribute_registry(user_id: str, attr_id: str, attr_data: dict, graph_id: str):
    """
    Update attribute registry with imported attribute.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    registry_path = data_root / "users" / user_id / "attribute_registry.json"
    
    # Load existing registry
    registry = {}
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            registry = json.load(f)
    
    # Update or add attribute
    if attr_id in registry:
        if "graphs" not in registry[attr_id]:
            registry[attr_id]["graphs"] = []
        if graph_id not in registry[attr_id]["graphs"]:
            registry[attr_id]["graphs"].append(graph_id)
    else:
        registry[attr_id] = {
            "name": attr_data.get("name", attr_id),
            "graphs": [graph_id],
            "created_at": time.time(),
            "updated_at": time.time()
        }
    
    # Save registry
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2)

def update_transition_registry(user_id: str, trans_id: str, trans_data: dict, graph_id: str):
    """
    Update transition registry with imported transition.
    """
    from ..config import get_data_root
    
    data_root = get_data_root()
    registry_path = data_root / "users" / user_id / "transition_registry.json"
    
    # Load existing registry
    registry = {}
    if registry_path.exists():
        with open(registry_path, 'r') as f:
            registry = json.load(f)
    
    # Update or add transition
    if trans_id in registry:
        if "graphs" not in registry[trans_id]:
            registry[trans_id]["graphs"] = []
        if graph_id not in registry[trans_id]["graphs"]:
            registry[trans_id]["graphs"].append(graph_id)
    else:
        registry[trans_id] = {
            "name": trans_data.get("name", trans_id),
            "graphs": [graph_id],
            "created_at": time.time(),
            "updated_at": time.time()
        }
    
    # Save registry
    with open(registry_path, 'w') as f:
        json.dump(registry, f, indent=2) 