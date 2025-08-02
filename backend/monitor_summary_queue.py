#!/usr/bin/env python3
"""
Monitor script for the summary queue
"""
import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the parent directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from backend.summary_queue_singleton import init_summary_queue
from backend.core.node_ops import load_node

def monitor_summary_queue():
    """Monitor the summary queue status"""
    
    print("🔍 Summary Queue Monitor")
    print("=" * 50)
    
    # Get the summary queue instance
    try:
        sq = init_summary_queue()
        print(f"✅ Summary queue initialized")
        
        # Check queue size
        queue_size = sq.queue_size()
        print(f"📊 Current queue size: {queue_size}")
        
        if queue_size > 0:
            print(f"⏳ There are {queue_size} pending summary requests")
        else:
            print(f"✅ No pending requests in queue")
            
    except Exception as e:
        print(f"❌ Error accessing summary queue: {e}")
        return
    
    # Check for test nodes and their status
    print("\n📁 Checking test nodes...")
    
    test_nodes = [
        ("testuser123", "testgraph", "testnode"),
        ("testuser123", "testgraph", "testnode_nodescription")
    ]
    
    for user_id, graph_id, node_id in test_nodes:
        try:
            node = load_node(user_id, graph_id, node_id)
            has_description = bool(node.get("description", "").strip())
            description_preview = node.get("description", "")[:100] + "..." if len(node.get("description", "")) > 100 else node.get("description", "")
            
            print(f"\n📄 Node: {node_id}")
            print(f"   User: {user_id}")
            print(f"   Graph: {graph_id}")
            print(f"   Name: {node.get('name', 'N/A')}")
            print(f"   Has description: {'✅ Yes' if has_description else '❌ No'}")
            if has_description:
                print(f"   Description: {description_preview}")
            else:
                print(f"   Status: Ready for summary generation")
                
        except Exception as e:
            print(f"\n📄 Node: {node_id}")
            print(f"   ❌ Error loading node: {e}")
    
    print("\n" + "=" * 50)
    print("💡 To check queue in real-time, run this script periodically")
    print("💡 Check backend logs for '[SummaryQueue]' messages")

def check_backend_logs():
    """Check if there are any summary queue related logs"""
    print("\n🔍 Checking for recent summary queue activity...")
    print("💡 Look for these patterns in the backend logs:")
    print("   - [SummaryQueue] Processing node:")
    print("   - [SummaryQueue] Summary for")
    print("   - [SummaryQueue] Saved summary for")
    print("   - [SummaryQueue] Failed to persist summary for")

if __name__ == "__main__":
    monitor_summary_queue()
    check_backend_logs() 