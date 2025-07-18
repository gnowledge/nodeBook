# AppImage Data Management

## Overview

When NodeBook runs as an AppImage, it manages data differently than in development mode to ensure user data persistence and proper isolation.

## Data Storage Locations

### AppImage Mode
- **User Data**: `~/.local/share/nodebook/`
- **Graph Data**: `~/.local/share/nodebook/users/`
- **Global Schemas**: `~/.local/share/nodebook/global/`
- **Python Environment**: Bundled within the AppImage at `/tmp/appimage_extracted_XXXXXX/resources/python_env/`

### Development Mode
- **User Data**: `./graph_data/`
- **Graph Data**: `./graph_data/users/`
- **Global Schemas**: `./graph_data/global/`
- **Python Environment**: System Python or project virtual environment

## AppImage Mount Points

When an AppImage runs, it extracts itself to a temporary directory:

```
/tmp/appimage_extracted_XXXXXX/
├── resources/
│   ├── python_env/          # Bundled Python environment
│   ├── backend/             # Backend code
│   ├── graph_data/          # Default graph data (read-only)
│   └── app.asar            # Frontend application
└── [other AppImage files]
```

## User Data Persistence

### Where User Data is Stored
1. **AppImage Mode**: `~/.local/share/nodebook/`
   - This follows the XDG Base Directory Specification
   - Data persists between AppImage runs
   - Survives AppImage updates

2. **Development Mode**: `./graph_data/`
   - Data stored in project directory
   - Part of version control (if desired)

### Data Migration
- When running in AppImage mode, the application automatically creates the user data directory
- If migrating from development to AppImage, copy `./graph_data/` to `~/.local/share/nodebook/`

## Python Environment Management

### AppImage Python Environment
- **Location**: Bundled within AppImage at `resources/python_env/`
- **Activation**: Automatically activated when AppImage runs
- **Dependencies**: All Python packages installed during build time

### Environment Variables Set
```bash
VIRTUAL_ENV=/tmp/appimage_extracted_XXXXXX/resources/python_env
PYTHONPATH=/tmp/appimage_extracted_XXXXXX/resources/backend
PATH=/tmp/appimage_extracted_XXXXXX/resources/python_env/bin:$PATH
NODEBOOK_USER_DATA_DIR=~/.local/share/nodebook
```

## File Structure

### AppImage Resources (Read-only)
```
resources/
├── python_env/              # Python virtual environment
│   ├── bin/
│   ├── lib/
│   └── site-packages/
├── backend/                 # Backend application code
├── graph_data/              # Default graph data templates
└── app.asar                # Frontend application
```

### User Data Directory (Writable)
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

## Troubleshooting

### Python Environment Issues
1. **ModuleNotFoundError**: Check if `python_env` is properly bundled
2. **Import Errors**: Verify `PYTHONPATH` is set correctly
3. **Missing Dependencies**: Rebuild AppImage with updated requirements

### Data Persistence Issues
1. **Data Not Saving**: Check write permissions to `~/.local/share/nodebook/`
2. **Data Not Loading**: Verify data directory structure
3. **Migration Issues**: Manually copy data from development to AppImage location

### AppImage Mount Point Detection
```bash
# Find current AppImage mount point
find /tmp -name "appimage_extracted*" -type d

# Check resources directory
ls -la /tmp/appimage_extracted_XXXXXX/resources/

# Verify Python environment
ls -la /tmp/appimage_extracted_XXXXXX/resources/python_env/bin/
```

## Development vs AppImage Differences

| Aspect | Development | AppImage |
|--------|-------------|----------|
| Python Environment | System/Project venv | Bundled venv |
| User Data | `./graph_data/` | `~/.local/share/nodebook/` |
| Code Location | Project directory | `/tmp/appimage_extracted_XXXXXX/` |
| Dependencies | Installed locally | Bundled in AppImage |
| Updates | Git pull | Download new AppImage |

## Best Practices

1. **Always use the provided utility functions** for path resolution
2. **Test data persistence** when switching between modes
3. **Backup user data** before major updates
4. **Use XDG directories** for proper Linux integration
5. **Handle both modes** in your code using `is_running_from_appimage()`

## Environment Detection

The application automatically detects whether it's running from an AppImage:

```python
from backend.core.appimage_utils import is_running_from_appimage

if is_running_from_appimage():
    # Use AppImage-specific paths
    data_dir = get_user_data_dir()
else:
    # Use development paths
    data_dir = Path("./graph_data")
``` 