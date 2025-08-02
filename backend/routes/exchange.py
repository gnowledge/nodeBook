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
from backend.core import dal

router = APIRouter()

def create_manifest(user_id: str, graph_id: str, files: list, temp_folder: str) -> Tuple[dict, str]:
    """
    Compose a manifest dictionary with export metadata, graph info, provenance, and included files.
    Write manifest.json to temp_folder. Return (manifest_dict, manifest_path).
    """
    # Try to get graph name/title from metadata.yaml or composed.yaml if available
    graph_name = graph_id
    try:
        meta = dal.read_metadata(user_id, graph_id)
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
        graph_folder = dal.get_graph_path(user_id, graph_id)
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
        graph_files = dal.list_graph_files(user_id, graph_id)
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
        try:
            composed_data = dal.read_composed(user_id, graph_id, "polymorphic")
            schema_files = create_schema_files(composed_data, graph_data_dir)
            copied_files.extend(schema_files)
            print(f"Created {len(schema_files)} schema files in graph_data/schema/")
        except Exception as e:
            print(f"Warning: Could not create schema files: {e}")
        
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
        result = dal.import_graph_from_ndf(user_id, graph_dir, manifest)
        
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