from fastapi import APIRouter
from pydantic import BaseModel
import re

router = APIRouter()

class CNLInput(BaseModel):
    text: str

@router.post("/parse-cnl")
def parse_cnl(input: CNLInput):
    text = input.text.strip()

    # Classify as ask or tell
    if text.lower().startswith("what") or text.lower().startswith("is "):
        cnl_type = "ask"
    else:
        cnl_type = "tell"

    result = []

    # Multi-line support
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    for line in lines:
        if cnl_type == "tell":
            parsed = parse_tell_statement(line)
        else:
            parsed = parse_ask_statement(line)
        result.append(parsed)

    return {"type": cnl_type, "statements": result}

def parse_tell_statement(line: str) -> dict:
    import re

    # Handle relation forms
    m = re.match(r"(.+?) (is_a|located_in|member_of) (.+)", line)
    if m:
        subj, rel, obj = m.groups()
        return {
            "type": "relation",
            "name": rel.strip(),
            "subject": subj.strip(),
            "object": obj.strip().rstrip(".")
        }

    # Handle attribute form: <subject> has <attribute> <value> [unit]
    m = re.match(r"(.+?) has (\w+) ([\d.eE+\-]+)(?: ([\w%/²³]+))?", line)
    if m:
        subj, attr, value, unit = m.groups()
        return {
            "type": "attribute",
            "subject": subj.strip(),
            "name": attr.strip(),
            "value": value.strip(),
            "unit": unit.strip() if unit else None
        }

    return {"error": "Could not parse tell statement", "text": line}



def parse_ask_statement(line: str) -> dict:
    # Simple "What is ..." queries
    m = re.match(r"What is the (\w+) of (.+?)\?", line, re.IGNORECASE)
    if m:
        attr, subj = m.groups()
        return {
            "type": "ask",
            "kind": "attribute",
            "name": attr.strip(),
            "subject": subj.strip()
        }
    return {"error": "Could not parse ask statement", "text": line}

