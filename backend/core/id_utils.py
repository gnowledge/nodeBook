
def normalize_id(label: str) -> str:
    """Normalize a human-readable label to a safe, file-friendly node ID."""
    return label.strip().lower().replace(" ", "_")
