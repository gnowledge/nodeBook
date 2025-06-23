#!/usr/bin/env python3
"""
Script to regenerate composed files for the oxygen example graph.
"""

import sys
import os
sys.path.append('backend')

from backend.core.compose import compose_graph

def regenerate_oxygen_composed():
    """Regenerate composed files for the oxygen example graph."""
    user_id = "undefined"
    graph_id = "oxygen_example"
    node_list = ["oxygen", "ionized_oxygen", "isotopic_oxygen"]
    
    print(f"Regenerating composed files for graph: {graph_id}")
    print(f"User: {user_id}")
    print(f"Nodes: {node_list}")
    
    try:
        # Call compose_graph function
        result = compose_graph(user_id, graph_id, node_list, "Oxygen Transition Example")
        
        print("✅ Successfully regenerated composed files:")
        print(f"  - composed.json")
        print(f"  - composed.yaml") 
        print(f"  - polymorphic_composed.json")
        
        # Print some stats
        if 'transitions' in result:
            print(f"  - Transitions included: {len(result['transitions'])}")
            for transition in result['transitions']:
                print(f"    * {transition['id']}: {transition.get('name', 'N/A')}")
        
        if 'nodes' in result:
            print(f"  - Nodes included: {len(result['nodes'])}")
        
        if 'relations' in result:
            print(f"  - Relations included: {len(result['relations'])}")
            
        if 'attributes' in result:
            print(f"  - Attributes included: {len(result['attributes'])}")
            
        return True
        
    except Exception as e:
        print(f"❌ Error regenerating composed files: {e}")
        return False

if __name__ == "__main__":
    regenerate_oxygen_composed()
