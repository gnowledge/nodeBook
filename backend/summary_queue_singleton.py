import os
import networkx as nx
from mistral.summary_queue import SummaryQueue

# This will hold a singleton SummaryQueue for the backend
# For demo, we use a single graph for all users/graphs (customize as needed)
G = nx.Graph()
summary_queue = None

# Optionally, you can load all nodes from disk into G here

def init_summary_queue(on_complete=None):
    global summary_queue
    if summary_queue is None:
        summary_queue = SummaryQueue(G, on_complete=on_complete)
    return summary_queue

# Usage:
# from .summary_queue_singleton import init_summary_queue
# sq = init_summary_queue()
# sq.submit(user_id, graph_id, node_id, node_data)
