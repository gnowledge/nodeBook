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

def parse_description_components(text):
    """
    Parse description text into verbs, verb phrases, adjectives, adverbs, connectives, proper nouns, common nouns, and prepositions.
    Returns a dict with lists for each category.
    """
    doc = nlp(text)
    verbs = []
    verb_phrases = []
    adjectives = []
    adverbs = []
    connectives = []
    proper_nouns = []
    common_nouns = []
    prepositions = []

    # Extract verbs, verb phrases, and other components
    for token in doc:
        if token.pos_ == "VERB":
            verbs.append(token.lemma_)
            # Try to get verb phrase (verb + children that are part of the phrase)
            phrase = [token.text]
            for child in token.children:
                if child.dep_ in ("aux", "prt", "advmod", "dobj", "prep", "acomp"):
                    phrase.append(child.text)
            if len(phrase) > 1:
                verb_phrases.append(" ".join(phrase))
        elif token.pos_ == "ADJ":
            adjectives.append(token.text)
        elif token.pos_ == "ADV":
            adverbs.append(token.text)
        elif token.pos_ == "CCONJ":
            connectives.append(token.text)
        elif token.pos_ == "PROPN":
            proper_nouns.append(token.text)
        elif token.pos_ == "NOUN":
            common_nouns.append(token.text)
        elif token.pos_ == "ADP":
            prepositions.append(token.text)

    return {
        "verbs": verbs,
        "verb_phrases": verb_phrases,
        "adjectives": adjectives,
        "adverbs": adverbs,
        "connectives": connectives,
        "proper_nouns": proper_nouns,
        "common_nouns": common_nouns,
        "prepositions": prepositions,
    }
