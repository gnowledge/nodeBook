const SimpleGraph = require('./simple-graph');
const SimpleGraphManager = require('./simple-graph-manager');

async function testSimpleGraph() {
    console.log('🧪 Testing Simple Graph implementation...');
    
    try {
        // Test 1: Create a graph manager
        console.log('\n1. Creating graph manager...');
        const graphManager = new SimpleGraphManager();
        await graphManager.initialize('./test-data');
        console.log('✅ Graph manager created successfully');
        
        // Test 2: Create a new graph
        console.log('\n2. Creating a new graph...');
        const userId = 'test-user-123';
        const graphName = 'Test Graph';
        const graph = await graphManager.createGraph(userId, graphName);
        console.log('✅ Graph created successfully');
        console.log(`   Graph ID: ${graph.key}`);
        console.log(`   Storage Path: ${graph.storagePath}`);
        
        // Test 3: Add a node
        console.log('\n3. Adding a node to the graph...');
        const node = await graph.addNode('Test Node', { description: 'A test node' });
        console.log('✅ Node added successfully');
        console.log(`   Node ID: ${node.id}`);
        console.log(`   Node Name: ${node.base_name}`);
        
        // Test 4: Add another node
        console.log('\n4. Adding another node...');
        const node2 = await graph.addNode('Second Node', { description: 'Another test node' });
        console.log('✅ Second node added successfully');
        console.log(`   Node ID: ${node2.id}`);
        console.log(`   Node Name: ${node2.base_name}`);
        
        // Test 5: Add a relation between nodes
        console.log('\n5. Adding a relation between nodes...');
        const relation = await graph.addRelation(node.id, node2.id, 'connects_to');
        console.log('✅ Relation added successfully');
        console.log(`   Relation ID: ${relation.id}`);
        console.log(`   Relation: ${relation.source_id} -> ${relation.target_id} (${relation.name})`);
        
        // Test 6: Add an attribute to a node
        console.log('\n6. Adding an attribute to a node...');
        const attribute = await graph.addAttribute(node.id, 'priority', 'high');
        console.log('✅ Attribute added successfully');
        console.log(`   Attribute ID: ${attribute.id}`);
        console.log(`   Attribute: ${attribute.name} = ${attribute.value}`);
        
        // Test 7: Apply a function to a node
        console.log('\n7. Applying a function to a node...');
        const func = await graph.applyFunction(node.id, 'calculated_value', '2 * 3');
        console.log('✅ Function applied successfully');
        console.log(`   Function: ${func.name} = ${func.value}`);
        
        // Test 8: Create a collaboration session
        console.log('\n8. Creating collaboration session...');
        const collaboration = await graphManager.createCollaborationSession(
            graph.key, 
            userId, 
            { edit: true, view: true }
        );
        console.log('✅ Collaboration session created successfully');
        console.log(`   Session ID: ${collaboration.sessionId}`);
        console.log(`   Share ID: ${collaboration.shareLink.id}`);
        console.log(`   Collaboration URL: ${collaboration.collaborationUrl}`);
        
        // Test 9: Get collaboration status
        console.log('\n9. Getting collaboration status...');
        const status = await graphManager.getCollaborationStatus(graph.key);
        console.log('✅ Collaboration status retrieved');
        console.log(`   Graph ID: ${status.graphId}`);
        console.log(`   Share Links: ${status.shareLinks.length}`);
        
        // Test 10: List graphs
        console.log('\n10. Listing user graphs...');
        const graphs = await graphManager.listGraphs(userId);
        console.log('✅ Graphs listed successfully');
        console.log(`   Found ${graphs.length} graphs`);
        graphs.forEach(g => {
            console.log(`   - ${g.name} (${g.id})`);
        });
        
        // Test 11: List all nodes
        console.log('\n11. Listing all nodes...');
        const allNodes = await graph.listAll('nodes');
        console.log('✅ Nodes listed successfully');
        console.log(`   Found ${allNodes.length} nodes`);
        allNodes.forEach(n => {
            console.log(`   - ${n.base_name} (${n.id})`);
        });
        
        // Test 12: List all relations
        console.log('\n12. Listing all relations...');
        const allRelations = await graph.listAll('relations');
        console.log('✅ Relations listed successfully');
        console.log(`   Found ${allRelations.length} relations`);
        allRelations.forEach(r => {
            console.log(`   - ${r.source_id} -> ${r.target_id} (${r.name})`);
        });
        
        // Test 13: Cleanup
        console.log('\n13. Cleaning up...');
        await graphManager.cleanup();
        console.log('✅ Cleanup completed successfully');
        
        console.log('\n🎉 All tests passed! Simple Graph implementation is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testSimpleGraph().catch(console.error);
}

module.exports = { testSimpleGraph };
