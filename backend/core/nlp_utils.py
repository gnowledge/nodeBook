# nlp_utils.py
import spacy
nlp = spacy.load("en_core_web_sm")

def parse_node_label(text):
    text = text.strip()

    # Do not parse if underscores or quotes are used
    if '_' in text or '"' in text or "'" in text:
        return { "title": text, "qualifier": None, "parsed": False }

    doc = nlp(text)
    for chunk in doc.noun_chunks:
        title = chunk.root.text
        modifier_tokens = [t for t in chunk if t.i < chunk.root.i and t.pos_ != "DET"]
        qualifier = " ".join(t.text for t in modifier_tokens) if modifier_tokens else None
        if qualifier:
            return { "title": title, "qualifier": qualifier, "parsed": True }

    return { "title": text, "qualifier": None, "parsed": False }
