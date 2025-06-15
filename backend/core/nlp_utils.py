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
    Parse description text into verbs, verb phrases, adjectives, adverbs, connectives, proper nouns, common nouns, prepositions,
    SVO triples, attribute-value pairs, and named entities (NER).
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
    svos = []
    attr_pairs = []
    entities = []

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
        # Attribute-value pairs: adjective modifier of a noun
        if token.dep_ == "amod" and token.head.pos_ == "NOUN":
            attr_pairs.append({"attribute": token.head.text, "value": token.text})

    # SVO extraction (subject-verb-object triples)
    for sent in doc.sents:
        for token in sent:
            if token.dep_ == "ROOT" and token.pos_ == "VERB":
                subj = [w for w in token.lefts if w.dep_ in ("nsubj", "nsubjpass")]
                obj = [w for w in token.rights if w.dep_ in ("dobj", "attr", "prep", "pobj")]
                if subj and obj:
                    svos.append({"subject": subj[0].text, "verb": token.text, "object": obj[0].text})

    # NER
    for ent in doc.ents:
        entities.append({"text": ent.text, "label": ent.label_})

    return {
        "verbs": verbs,
        "verb_phrases": verb_phrases,
        "adjectives": adjectives,
        "adverbs": adverbs,
        "connectives": connectives,
        "proper_nouns": proper_nouns,
        "common_nouns": common_nouns,
        "prepositions": prepositions,
        "svos": svos,
        "attribute_value_pairs": attr_pairs,
        "entities": entities,
    }
