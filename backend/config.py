import os
from pathlib import Path

def get_data_root() -> Path:
    """
    Returns the root directory for all graph data. Uses the NDF_DATA_ROOT environment variable if set, else defaults to 'graph_data'.
    """
    return Path(os.environ.get("NDF_DATA_ROOT", "graph_data"))

def get_openai_api_key() -> str:
    """
    Returns the OpenAI API key from environment variable.
    """
    return os.environ.get("OPENAI_API_KEY", "")

# For backward compatibility, keep the old variable name (deprecated)
GRAPH_DATA_PATH = get_data_root()
