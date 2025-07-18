# AppImage Questions Answered

## 1. AppImage Mount Point Variable

### Question: What is the variable name of the tmp folder where AppImage gets mounted?

**Answer:** There is no fixed variable name for the AppImage mount point. The AppImage extracts itself to a temporary directory with a unique name each time it runs.

### Mount Point Patterns:
- **AppImage Format**: `/tmp/.mount_NodeBoXXXXXX/`
- **Extracted Format**: `/tmp/appimage_extracted_XXXXXX/`

### How to Detect the Mount Point:
```bash
# Find current AppImage mount points
find /tmp -name "appimage_extracted*" -type d
find /tmp -name ".mount_NodeBo*" -type d
```

### In Code Detection:
```python
import os
import sys
from pathlib import Path

def get_appimage_mount_point():
    """Get the current AppImage mount point."""
    # Check for extracted AppImage
    extracted_dirs = list(Path("/tmp").glob("appimage_extracted_*"))
    if extracted_dirs:
        return extracted_dirs[0]
    
    # Check for mounted AppImage
    mount_dirs = list(Path("/tmp").glob(".mount_NodeBo*"))
    if mount_dirs:
        return mount_dirs[0]
    
    return None
```

### Current Mount Point Structure:
```
/tmp/appimage_extracted_57e289e0c79098570fc6178e56f655c7/
├── resources/
│   ├── python_env/          # ✅ Python environment (bundled)
│   ├── backend/             # Backend code
│   ├── graph_data/          # Default graph data
│   └── app.asar            # Frontend application
└── [other AppImage files]
```

## 2. User Data Persistence

### Question: When user is working, graph_data is in the mounted directory, right? When the App is closed where will the data be?

**Answer:** No, user data is NOT stored in the mounted directory. The mounted directory is read-only and temporary.

### Data Storage Locations:

#### AppImage Mode (Production):
- **User Data**: `~/.local/share/nodebook/`
- **Graph Data**: `~/.local/share/nodebook/users/`
- **Global Schemas**: `~/.local/share/nodebook/global/`
- **Python Environment**: Bundled in AppImage (read-only)

#### Development Mode:
- **User Data**: `./graph_data/`
- **Graph Data**: `./graph_data/users/`
- **Global Schemas**: `./graph_data/global/`
- **Python Environment**: System Python or project venv

### Data Persistence Behavior:

#### When AppImage is Running:
1. **Mounted Directory**: Read-only, contains bundled resources
2. **User Data**: Written to `~/.local/share/nodebook/`
3. **Data Persistence**: Survives AppImage restarts and updates

#### When AppImage is Closed:
1. **Mounted Directory**: Automatically cleaned up by system
2. **User Data**: Remains in `~/.local/share/nodebook/`
3. **Data Safety**: User data is preserved between sessions

### File Structure Comparison:

#### AppImage Resources (Read-only, Temporary):
```
/tmp/appimage_extracted_XXXXXX/resources/
├── python_env/              # Bundled Python environment
├── backend/                 # Backend application code
├── graph_data/              # Default templates (read-only)
└── app.asar                # Frontend application
```

#### User Data Directory (Writable, Persistent):
```
~/.local/share/nodebook/
├── users/                   # User-specific graph data
│   └── [username]/
│       ├── graphs/
│       ├── nodes/
│       └── transitions/
└── global/                  # Global schema definitions
    ├── node_types.json
    ├── relation_types.json
    └── transition_types.json
```

## 3. Python Environment Management

### Question: Currently it is getting created at the project root where the development is taking place and not in the mounted image.

**Answer:** The Python environment is now properly bundled within the AppImage and available in the mounted directory.

### Current Status:
- ✅ **Python Environment**: Bundled in AppImage at `resources/python_env/`
- ✅ **Dependencies**: All installed during build time
- ✅ **Activation**: Automatic when AppImage runs
- ✅ **Path Resolution**: Handled by the application

### Environment Variables Set:
```bash
VIRTUAL_ENV=/tmp/appimage_extracted_XXXXXX/resources/python_env
PYTHONPATH=/tmp/appimage_extracted_XXXXXX/resources/backend
PATH=/tmp/appimage_extracted_XXXXXX/resources/python_env/bin:$PATH
NODEBOOK_USER_DATA_DIR=~/.local/share/nodebook
```

## 4. Verification Commands

### Check if Python Environment is Bundled:
```bash
# Find current AppImage mount point
find /tmp -name "appimage_extracted*" -type d

# Check if python_env is included
ls -la /tmp/appimage_extracted_XXXXXX/resources/

# Verify Python executable exists
ls -la /tmp/appimage_extracted_XXXXXX/resources/python_env/bin/python
```

### Check User Data Directory:
```bash
# Check if user data directory exists
ls -la ~/.local/share/nodebook/

# Create test data to verify persistence
mkdir -p ~/.local/share/nodebook/users/testuser
echo '{"test": "data"}' > ~/.local/share/nodebook/users/testuser/test.json
```

### Test AppImage Data Management:
```bash
# Run AppImage
./electron/dist/NodeBook-0.1.0.AppImage --appimage-extract-and-run

# Check if user data is created
ls -la ~/.local/share/nodebook/

# Stop AppImage and verify data persists
pkill -f "NodeBook.*AppImage"
ls -la ~/.local/share/nodebook/
```

## 5. Summary

### ✅ What's Working:
1. **Python Environment**: Properly bundled in AppImage
2. **Data Persistence**: User data stored in `~/.local/share/nodebook/`
3. **Environment Detection**: Application detects AppImage vs development mode
4. **Path Resolution**: Utility functions handle both modes correctly

### 📁 Data Flow:
1. **AppImage Starts** → Extracts to `/tmp/appimage_extracted_XXXXXX/`
2. **User Works** → Data saved to `~/.local/share/nodebook/`
3. **AppImage Closes** → Mounted directory cleaned up, user data preserved
4. **AppImage Restarts** → User data loaded from persistent location

### 🔧 Key Files:
- `backend/core/appimage_utils.py` - AppImage detection and path management
- `electron/main.js` - Electron AppImage environment setup
- `docs/APPIMAGE_DATA_MANAGEMENT.md` - Comprehensive documentation

The AppImage now properly manages both the Python environment (bundled) and user data (persistent), addressing both of your concerns. 