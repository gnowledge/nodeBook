const LibP2PGraph = require('./libp2p-graph');
const LibP2PGraphManager = require('./libp2p-graph-manager');

async function testLibP2P() {
    console.log('🧪 Testing LibP2P implementation...');
    
    try {
        // Test 1: Create a graph manager
        console.log('\n1. Creating graph manager...');
        const graphManager = new LibP2PGraphManager();
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
        
        // Test 4: Create a collaboration session
        console.log('\n4. Creating collaboration session...');
        const collaboration = await graphManager.createCollaborationSession(
            graph.key, 
            userId, 
            { edit: true, view: true }
        );
        console.log('✅ Collaboration session created successfully');
        console.log(`   Session ID: ${collaboration.sessionId}`);
        console.log(`   Share ID: ${collaboration.shareLink.id}`);
        console.log(`   Collaboration URL: ${collaboration.collaborationUrl}`);
        
        // Test 5: Get collaboration status
        console.log('\n5. Getting collaboration status...');
        const status = await graphManager.getCollaborationStatus(graph.key);
        console.log('✅ Collaboration status retrieved');
        console.log(`   Peer ID: ${status.peerId}`);
        console.log(`   Share Links: ${status.shareLinks.length}`);
        
        // Test 6: List graphs
        console.log('\n6. Listing user graphs...');
        const graphs = await graphManager.listGraphs(userId);
        console.log('✅ Graphs listed successfully');
        console.log(`   Found ${graphs.length} graphs`);
        graphs.forEach(g => {
            console.log(`   - ${g.name} (${g.id})`);
        });
        
        // Test 7: Cleanup
        console.log('\n7. Cleaning up...');
        await graphManager.cleanup();
        console.log('✅ Cleanup completed successfully');
        
        console.log('\n🎉 All tests passed! LibP2P implementation is working correctly.');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
}

// Run the test
if (require.main === module) {
    testLibP2P().catch(console.error);
}

module.exports = { testLibP2P };
