import os
import sys

# Add the parent directory to Python path to find the mistral module
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

try:
    from mistral.summary_queue import SummaryQueue, init_summary_queue
except ImportError:
    # Fallback for when mistral module is not available
    class SummaryQueue:
        def __init__(self):
            pass
        
        def submit(self, user_id, graph_id, node_id):
            # Placeholder implementation
            pass
        
        def queue_size(self):
            return 0

    def init_summary_queue():
        return SummaryQueue()

# Use the init_summary_queue function from the mistral module
# This will hold a singleton SummaryQueue for the backend

# Usage:
# from .summary_queue_singleton import init_summary_queue
# sq = init_summary_queue()
# sq.submit(user_id, graph_id, node_id)
