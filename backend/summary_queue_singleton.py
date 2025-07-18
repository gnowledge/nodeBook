import os
import sys
import networkx as nx

# Add the parent directory to Python path to find the mistral module
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from mistral.summary_queue import SummaryQueue
except ImportError:
    # Fallback for when mistral module is not available
    class SummaryQueue:
        def __init__(self, graph, on_complete=None):
            self.graph = graph
            self.on_complete = on_complete
        
        def submit(self, user_id, graph_id, node_id, node_data):
            # Placeholder implementation
            pass

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
