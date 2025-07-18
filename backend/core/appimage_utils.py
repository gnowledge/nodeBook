import os
import sys
from pathlib import Path
from typing import Optional

def is_running_from_appimage() -> bool:
    """Check if the application is running from an AppImage."""
    return bool(os.environ.get('APPIMAGE')) or 'app.asar' in sys.executable

def get_appimage_resources_path() -> Optional[Path]:
    """Get the path to AppImage resources directory."""
    if not is_running_from_appimage():
        return None
    
    # Try to find the resources path
    possible_paths = [
        Path(os.environ.get('APPDIR', '')) / 'usr' / 'share' / 'nodebook' / 'resources',
        Path(getattr(sys, '_MEIPASS', '')) / 'resources' if hasattr(sys, '_MEIPASS') else None,
        Path(__file__).parent.parent.parent / 'resources'
    ]
    
    for path in possible_paths:
        if path and path.exists():
            return path
    
    return None

def get_user_data_dir() -> Path:
    """Get the user data directory for persistent storage."""
    if is_running_from_appimage():
        # Use XDG user data directory for AppImage
        xdg_data_home = os.environ.get('XDG_DATA_HOME')
        if xdg_data_home:
            user_data_dir = Path(xdg_data_home) / 'nodebook'
        else:
            user_data_dir = Path.home() / '.local' / 'share' / 'nodebook'
    else:
        # Development mode - use project directory
        user_data_dir = Path.cwd() / 'graph_data'
    
    # Ensure directory exists
    user_data_dir.mkdir(parents=True, exist_ok=True)
    return user_data_dir

def get_graph_data_dir() -> Path:
    """Get the graph data directory."""
    user_data_dir = get_user_data_dir()
    
    if is_running_from_appimage():
        # In AppImage, use user's home directory
        graph_data_dir = user_data_dir / 'users'
    else:
        # Development mode - use project directory
        graph_data_dir = user_data_dir / 'users'
    
    graph_data_dir.mkdir(parents=True, exist_ok=True)
    return graph_data_dir

def get_global_data_dir() -> Path:
    """Get the global data directory."""
    user_data_dir = get_user_data_dir()
    
    if is_running_from_appimage():
        # In AppImage, use user's home directory
        global_data_dir = user_data_dir / 'global'
    else:
        # Development mode - use project directory
        global_data_dir = user_data_dir / 'global'
    
    global_data_dir.mkdir(parents=True, exist_ok=True)
    return global_data_dir

def get_python_env_path() -> Optional[Path]:
    """Get the Python environment path for AppImage."""
    if not is_running_from_appimage():
        return None
    
    resources_path = get_appimage_resources_path()
    if resources_path:
        python_env_path = resources_path / 'python_env'
        if python_env_path.exists():
            return python_env_path
    
    return None

def setup_appimage_environment():
    """Setup environment variables for AppImage."""
    if not is_running_from_appimage():
        return
    
    # Set up Python path for AppImage
    python_env_path = get_python_env_path()
    if python_env_path:
        python_bin = python_env_path / 'bin'
        if python_bin.exists():
            # Add Python environment to PATH
            current_path = os.environ.get('PATH', '')
            os.environ['PATH'] = f"{python_bin}:{current_path}"
            os.environ['VIRTUAL_ENV'] = str(python_env_path)
            
            # Set PYTHONPATH to include backend
            resources_path = get_appimage_resources_path()
            if resources_path:
                backend_path = resources_path / 'backend'
                if backend_path.exists():
                    os.environ['PYTHONPATH'] = str(backend_path)
    
    # Set up user data directory
    user_data_dir = get_user_data_dir()
    os.environ['NODEBOOK_USER_DATA_DIR'] = str(user_data_dir)
    
    print(f"[AppImage] User data directory: {user_data_dir}")
    print(f"[AppImage] Graph data directory: {get_graph_data_dir()}")
    print(f"[AppImage] Global data directory: {get_global_data_dir()}") 