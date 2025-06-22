import threading
import queue
import time
import networkx as nx
import requests
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.core.node_ops import load_node, save_node
from backend.core.id_utils import get_user_id

# === CONFIG ===
HF_API = "https://gnowgi-controllednl.hf.space/gradio_api/call/predict"

class NodeSummaryJob:
    def __init__(self, user_id, graph_id, node_id, node_data):
        self.user_id = user_id
        self.graph_id = graph_id
        self.node_id = node_id
        self.node_data = node_data

class SummaryQueue:
    def __init__(self, graph: nx.Graph, on_complete=None):
        self.graph = graph
        self.job_queue = queue.Queue()
        self.on_complete = on_complete  # callback for UI/report
        self.worker = threading.Thread(target=self.worker_loop, daemon=True)
        self.worker.start()

    def submit(self, user_id, graph_id, node_id, node_data):
        self.job_queue.put(NodeSummaryJob(user_id, graph_id, node_id, node_data))

    def worker_loop(self):
        while True:
            job = self.job_queue.get()
            if job is None:
                break  # for clean shutdown
            print(f"[SummaryQueue] Processing node: {job.node_id}")
            summary = self.get_summary(job.node_data)
            print(f"[SummaryQueue] Summary for {job.node_id}: {summary}")
            # Update the graph in memory only if node exists
            if job.node_id in self.graph.nodes:
                self.graph.nodes[job.node_id]['description'] = summary
            # Persist the summary to the node JSON file
            try:
                node = load_node(job.user_id, job.graph_id, job.node_id)
                node["description"] = summary
                save_node(job.user_id, job.graph_id, job.node_id, node)
                print(f"[SummaryQueue] Saved summary for {job.node_id} to disk.")
            except Exception as e:
                print(f"[SummaryQueue] Failed to persist summary for {job.node_id}: {e}")
            if self.on_complete:
                self.on_complete(job.node_id, summary)
            self.job_queue.task_done()

    def get_summary(self, node_data):
        # Use HuggingFace Space API for phi-2 summarization
        node_name = node_data.get("name", "")
        paragraph = node_data.get("description", "")
        payload = {
            "data": [
                "summarize",
                node_name,
                paragraph
            ]
        }
        try:
            res = requests.post(HF_API, json=payload, timeout=180)
            res.raise_for_status()
            # The response is a JSON with a 'data' field containing a list, first element is the summary
            summary = res.json().get("data", [""])[0]
            return summary
        except Exception as e:
            return f"[Summary error: {e}]"

    def shutdown(self):
        self.job_queue.put(None)
        self.worker.join()

    def queue_size(self):
        return self.job_queue.qsize()

# === Example usage ===
if __name__ == "__main__":
    import json
    user_id = "user0"
    graph_id = "testgraph"
    nodes_dir = os.path.join("..", "graph_data", "users", user_id, "nodes")
    G = nx.Graph()
    # Load all node JSON files
    for fname in os.listdir(nodes_dir):
        if fname.endswith(".json"):
            node_id = fname[:-5]
            with open(os.path.join(nodes_dir, fname)) as f:
                node_data = json.load(f)
            G.add_node(node_id, **node_data)
    # (Optional) Add edges if you want, based on relations in node_data
    def report(node_id, summary):
        print(f"Node {node_id} summary completed: {summary}")
    sq = SummaryQueue(G, on_complete=report)
    # Submit all nodes for summary
    for node_id, node_data in G.nodes(data=True):
        sq.submit(user_id, graph_id, node_id, node_data)
    print("All jobs submitted. Waiting for completion...")
    sq.job_queue.join()
    print("All summaries completed!")
    sq.shutdown()
