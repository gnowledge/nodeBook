import os
import networkx as nx
from routes.nodes import GRAPH_DATA_PATH, load_node

graph = nx.DiGraph()

def populate_graph():
    graph.clear()
    for file in os.listdir("graph_data"):
        if not file.endswith(".yaml"):
            continue
        if file in {"relation_types.yaml", "attribute_types.yaml", "node_types.yaml"}:
            continue  # Skip schema files
        data = load_node(file[:-5])  # e.g., "china" from "china.yaml"
        node = data.get("node", {})
        node_id = node.get("id")
        label = node.get("label", node_id)
        if node_id:
            graph.add_node(node_id, label=label)
        for rel in data.get("relations", []):
            source = rel.get("subject")
            target = rel.get("object")
            label = rel.get("name")
            if source and target and label:
                graph.add_edge(source, target, label=label)
