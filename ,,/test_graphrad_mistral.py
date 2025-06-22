import yaml
import networkx as nx
from graphrag import GraphRAG
import requests

# === CONFIG ===
MISTRAL_API = "http://localhost:8001/summarize"  # or /suggest if you expose that route

# === 1. Load Graph from YAML ===
def load_graph_from_yaml(yaml_path: str) -> nx.Graph:
    with open(yaml_path) as f:
        data = yaml.safe_load(f)
    G = nx.Graph()
    for node_id, node_data in data.get("nodes", {}).items():
        G.add_node(node_id, **node_data)
    for edge in data.get("edges", []):
        G.add_edge(edge["source"], edge["target"])
    return G

# === 2. Build prompt with GraphRAG ===
def build_prompt_with_rag(G: nx.Graph, summary: str, top_k: int = 3) -> str:
    grag = GraphRAG(graph=G, embedding_key="description", model_name="all-MiniLM-L6-v2")
    results = grag.retrieve(summary, top_k=top_k)

    context_lines = []
    for node_id, score in results:
        desc = G.nodes[node_id].get("description", "")
        context_lines.append(f"- {node_id}: {desc}")
    context = "\n".join(context_lines)

    prompt = f"""### Node Summary:
{summary.strip()}

### Related Knowledge:
{context}

### Instruction:
Suggest new relations and attributes for this node based on the above context.
Format your response as two lists:
- Suggested Relations
- Suggested Attributes
"""
    return prompt

# === 3. Send prompt to Mistral ===
def ask_mistral(prompt: str) -> str:
    response = requests.post(MISTRAL_API, json={"text": prompt})
    return response.json()["summary"]

# === MAIN ===
if __name__ == "__main__":
    yaml_path = "your_graph.yaml"  # Update this to your YAML path
    test_summary = "Mitochondrion is an organelle found in eukaryotic cells that produces energy through cellular respiration."

    G = load_graph_from_yaml(yaml_path)
    prompt = build_prompt_with_rag(G, test_summary)
    print("\n📤 Prompt to Mistral:\n", prompt)

    answer = ask_mistral(prompt)
    print("\n🧠 Mistral Suggestion:\n", answer)
