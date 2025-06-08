import markdown
import bleach
from pathlib import Path
import json

def render_description_md(text: str) -> str:
    raw_html = markdown.markdown(text or "")
    safe_html = bleach.clean(
        raw_html,
        tags=["p", "b", "i", "strong", "em", "ul", "ol", "li", "a", "code", "pre", "blockquote"],
        attributes={"a": ["href"]},
    )
    return safe_html

def normalize_id(name: str) -> str:
    return name.strip().lower().replace(" ", "_")

def save_json_file(path: Path, data: dict):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

def load_json_file(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_text_file(path: Path) -> str:
    with path.open("r", encoding="utf-8") as f:
        return f.read()    
