import re
from typing import List, Dict

def extract_node_sections_from_markdown(md_text: str) -> List[Dict]:
    sections = []
    current_node = None
    current_desc_lines = []
    current_cnl_lines = []
    in_cnl_block = False

    lines = md_text.splitlines()

    for line in lines:
        line_strip = line.strip()

        # Start of a new node section
        if line_strip.startswith("# "):
            if current_node:
                sections.append({
                    "id": current_node,
                    "description": "\n".join(current_desc_lines).strip(),
                    "cnl": "\n".join(current_cnl_lines).strip()
                })
            current_node = line_strip[2:].strip()
            current_desc_lines = []
            current_cnl_lines = []
            in_cnl_block = False
        elif line_strip.startswith("```cnl"):
            in_cnl_block = True
        elif line_strip.startswith("```") and in_cnl_block:
            in_cnl_block = False
        else:
            if in_cnl_block:
                current_cnl_lines.append(line)
            else:
                current_desc_lines.append(line)

    # Append the last section
    if current_node:
        sections.append({
            "id": current_node,
            "description": "\n".join(current_desc_lines).strip(),
            "cnl": "\n".join(current_cnl_lines).strip()
        })

    return sections
