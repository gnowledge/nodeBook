import yaml
import networkx as nx
from sentence_transformers import SentenceTransformer, util
import requests

# === CONFIG ===
YAML_PATH = "your_graph.yaml"  # <-- Update this
MISTRAL_API = "http://localhost:8001/summarize"

# === Load YAML into Graph ===
def load_graph_from_yaml(yaml_path: str) -> nx.Graph:
    with open(yaml_path) as f:
        data = yaml.safe_load(f)
    G = nx.Graph()
    for node_id, node_data in data.get("nodes", {}).items():
        G.add_node(node_id, **node_data)
    for edge in data.get("edges", []):
        G.add_edge(edge["source"], edge["target"])
    return G

# === Manual GraphRAG using sentence-transformers ===
model = SentenceTransformer("all-MiniLM-L6-v2")

def simple_graphrag(G: nx.Graph, query: str, top_k: int = 3):
    node_ids = list(G.nodes)
    node_texts = [G.nodes[n].get("description", "") for n in node_ids]

    query_emb = model.encode(query, convert_to_tensor=True)
    node_embs = model.encode(node_texts, convert_to_tensor=True)

    hits = util.semantic_search(query_emb, node_embs, top_k=top_k)[0]
    return [(node_ids[hit['corpus_id']], hit['score']) for hit in hits]

# === Build Mistral Prompt ===
def build_mistral_prompt(summary: str, rag_results, G: nx.Graph) -> str:
    context_lines = []
    for node_id, score in rag_results:
        desc = G.nodes[node_id].get("description", "")
        context_lines.append(f"- {node_id}: {desc}")
    context_text = "\n".join(context_lines)

    prompt = f"""### Node Summary:
{summary.strip()}

### Related Knowledge:
{context_text}

### Instruction:
Suggest new knowledge that can be added about this node, and classify each item as one of:

- a relation (e.g. "mitochondrion performs respiration")
- a scalar attribute (e.g. "count per cell: 1000")

Only include scalar attributes that cannot be expressed as entities or relations.
Return two clear lists:
- Relations
- Scalar Attributes
"""
    return prompt

# === Send to Mistral ===
def ask_mistral(prompt: str) -> str:
    res = requests.post(MISTRAL_API, json={"text": prompt})
    return res.json()["summary"]

# === Parse Mistral Output ===
def parse_mistral_output(raw_text):
    relations = []
    attributes = []
    current = None

    for line in raw_text.strip().splitlines():
        line = line.strip("- ").strip()
        if not line:
            continue
        if "relation" in line.lower():
            current = "relation"
        elif "attribute" in line.lower():
            current = "attribute"
        elif current == "relation":
            relations.append(line)
        elif current == "attribute":
            attributes.append(line)

    return relations, attributes

# === MAIN ===
if __name__ == "__main__":
    test_summary = "Mitochondrion is an organelle found in eukaryotic cells that produces energy through cellular respiration."

    G = load_graph_from_yaml(YAML_PATH)
    rag = simple_graphrag(G, test_summary)
    prompt = build_mistral_prompt(test_summary, rag, G)

    print("\n📤 Prompt sent to Mistral:\n")
    print(prompt)

    raw = ask_mistral(prompt)
    relations, attributes = parse_mistral_output(raw)

    print("\n🧠 Mistral Raw Output:\n")
    print(raw)

    print("\n🧩 Parsed Relations:")
    for r in relations:
        print(" -", r)

    print("\n🔢 Parsed Scalar Attributes:")
    for a in attributes:
        print(" -", a)
