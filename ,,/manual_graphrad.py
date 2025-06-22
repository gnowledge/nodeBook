import networkx as nx
from sentence_transformers import SentenceTransformer, util

model = SentenceTransformer("all-MiniLM-L6-v2")

def simple_graphrag(G: nx.Graph, query: str, top_k: int = 3):
    """
    Fallback GraphRAG using sentence-transformers and NetworkX.
    Returns a list of (node_id, similarity_score).
    """
    node_ids = list(G.nodes)
    node_texts = [G.nodes[n].get("description", "") for n in node_ids]

    query_emb = model.encode(query, convert_to_tensor=True)
    node_embs = model.encode(node_texts, convert_to_tensor=True)

    hits = util.semantic_search(query_emb, node_embs, top_k=top_k)[0]
    return [(node_ids[hit['corpus_id']], hit['score']) for hit in hits]
