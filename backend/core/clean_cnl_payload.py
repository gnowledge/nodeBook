import re

def clean_cnl_payload(raw_text: str) -> str:
    # If it starts and ends with quotes, and contains \\n, treat it as escaped JSON string
    if raw_text.startswith('"') and raw_text.endswith('"') and '\\n' in raw_text:
        # Unescape \n, \", \t, etc.
        try:
            import json
            cleaned = json.loads(raw_text)
            return cleaned
        except Exception as e:
            print(f"[WARN] Failed to decode JSON-escaped input: {e}")
            pass

    # Replace literal '\\n' with actual line breaks, just in case
    raw_text = raw_text.replace('\\\\n', '\n').replace('\\n', '\n')

    return raw_text
