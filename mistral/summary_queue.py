#!/usr/bin/env python3
"""
Summary Queue for OpenAI API integration
"""
import os
import sys
import json
import time
import threading
import queue
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.core.node_ops import load_node, save_node
from backend.config import get_openai_api_key

# OpenAI API configuration
OPENAI_API_URL = "https://api.openai.com/v1/chat/completions"

class SummaryQueue:
    def __init__(self):
        self.job_queue = queue.Queue()
        self.worker_thread = None
        self.running = False
        self.start_worker()
    
    def start_worker(self):
        """Start the worker thread"""
        if self.worker_thread is None or not self.worker_thread.is_alive():
            self.running = True
            self.worker_thread = threading.Thread(target=self.worker_loop, daemon=True)
            self.worker_thread.start()
            print("[SummaryQueue] Worker thread started")
    
    def submit(self, user_id, graph_id, node_id):
        """Submit a node for description generation"""
        job = {
            'user_id': user_id,
            'graph_id': graph_id,
            'node_id': node_id,
            'timestamp': time.time()
        }
        self.job_queue.put(job)
        print(f"[SummaryQueue] Submitted node {node_id} for description generation")
    
    def get_description(self, node_name):
        """Get a brief description/definition of the node from OpenAI"""
        api_key = get_openai_api_key()
        if not api_key or api_key == "your_openai_api_key_here":
            return f"Error: OpenAI API key not configured"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        # Updated prompt to ask for a brief description/definition
        prompt = f"""Please provide a brief, single-sentence description or definition of '{node_name}'. 
        
This should be a clear characterization that explains what this concept/entity is, suitable for understanding its role and potential relationships in a knowledge graph.

Keep it concise and informative - no more than one sentence."""

        data = {
            "model": "gpt-3.5-turbo",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant that provides concise, accurate descriptions of concepts and entities."},
                {"role": "user", "content": prompt}
            ],
            "max_tokens": 100,
            "temperature": 0.3
        }
        
        try:
            response = requests.post(OPENAI_API_URL, headers=headers, json=data, timeout=30)
            response.raise_for_status()
            
            result = response.json()
            if 'choices' in result and len(result['choices']) > 0:
                description = result['choices'][0]['message']['content'].strip()
                return description
            else:
                return f"Error: Unexpected response format from OpenAI API"
                
        except requests.exceptions.RequestException as e:
            return f"Error: API request failed - {e}"
        except Exception as e:
            return f"Error: {str(e)}"
    
    def worker_loop(self):
        """Worker loop to process description generation jobs"""
        while self.running:
            try:
                # Get job from queue with timeout
                job = self.job_queue.get(timeout=1)
                
                user_id = job['user_id']
                graph_id = job['graph_id']
                node_id = job['node_id']
                
                print(f"[SummaryQueue] Processing node: {node_id}")
                
                try:
                    # Load the node
                    node = load_node(user_id, graph_id, node_id)
                    node_name = node.get('name', node_id)
                    
                    # Generate description
                    description = self.get_description(node_name)
                    
                    # Update the node with the description
                    node['description'] = description
                    save_node(user_id, graph_id, node_id, node)
                    
                    print(f"[SummaryQueue] Saved description for {node_id}: {description[:100]}...")
                    
                except Exception as e:
                    print(f"[SummaryQueue] Failed to persist description for {node_id}: {e}")
                
                # Mark job as done
                self.job_queue.task_done()
                
            except queue.Empty:
                # No jobs in queue, continue
                continue
            except Exception as e:
                print(f"[SummaryQueue] Error in worker loop: {e}")
                continue
    
    def queue_size(self):
        """Get the current queue size"""
        return self.job_queue.qsize()
    
    def stop(self):
        """Stop the worker thread"""
        self.running = False
        if self.worker_thread and self.worker_thread.is_alive():
            self.worker_thread.join(timeout=5)
            print("[SummaryQueue] Worker thread stopped")

# Global instance
_summary_queue = None

def init_summary_queue():
    """Initialize and return the global summary queue instance"""
    global _summary_queue
    if _summary_queue is None:
        _summary_queue = SummaryQueue()
    return _summary_queue
