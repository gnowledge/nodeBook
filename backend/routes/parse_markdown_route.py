
from fastapi import APIRouter, HTTPException
from fastapi.responses import PlainTextResponse
from pathlib import Path
import yaml
import re

router = APIRouter()

def parse_cnl_markdown_clean(md_text):
    doc = {
        "metadata": {},
        "nodes": [],
    }

    sections = re.split(r'^# (.+)$', md_text, flags=re.MULTILINE)

    if sections[0].strip():
        doc["metadata"]["description"] = sections[0].strip()

    for i in range(1, len(sections), 2):
        node_id = sections[i].strip()
        content = sections[i + 1].strip()
        node = {
            "id": node_id,
            "description": "",
            "relations": [],
            "attributes": []
        }

        parts = re.split(r':::cnl\s*\n(.*?)\n:::', content, flags=re.DOTALL)
        text_blocks = parts[::2]
        cnl_blocks = parts[1::2]

        if text_blocks and text_blocks[0].strip():
            node["description"] = text_blocks[0].strip()

        for block in cnl_blocks:
            for line in block.strip().splitlines():
                line = line.strip()
                if not line:
                    continue
                if line.startswith("has <"):
                    m = re.match(r'has <(.*?)> (.*?) ?(?:\[(.*?)\])?', line)
                    if m:
                        name, value, unit = m.groups()
                        node["attributes"].append({
                            "name": name.strip(),
                            "value": value.strip(),
                            "unit": (unit or "").strip()
                        })
                elif line.startswith("<"):
                    m = re.match(r'<(.*?)> (.*)', line)
                    if m:
                        rel, obj = m.groups()
                        node["relations"].append({
                            "name": rel.strip(),
                            "object": obj.strip()
                        })
        doc["nodes"].append(node)

    return doc

@router.post("/api/ndf/users/{user_id}/graphs/{graph_id}/parse-markdown", response_class=PlainTextResponse)
async def parse_markdown(user_id: str, graph_id: str):
    file_path = Path(f"graph_data/{user_id}/{graph_id}/cnl.md")
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Markdown file not found")

    raw_md = file_path.read_text(encoding="utf-8")
    parsed = parse_cnl_markdown_clean(raw_md)

    out_path = Path(f"graph_data/{user_id}/{graph_id}/parsed.yaml")
    out_path.write_text(yaml.dump(parsed, sort_keys=False), encoding="utf-8")

    return "Parsed successfully and saved as parsed.yaml"
