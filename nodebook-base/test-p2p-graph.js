import P2PGraph from './p2p-graph.js';
import P2PGraphManager from './p2p-graph-manager.js';

console.log('🧪 Testing P2P Graph Functionality...\n');

async function testP2PGraph() {
    let graphManager = null;
    let graph1 = null;
    let graph2 = null;

    try {
        // Test 1: Initialize P2P Graph Manager
        console.log('1️⃣ Testing P2P Graph Manager initialization...');
        graphManager = new P2PGraphManager('./test_p2p_data');
        await graphManager.initialize();
        console.log('✅ P2P Graph Manager initialized');
        console.log('   Status:', graphManager.getP2PStatus());

        // Test 2: Create P2P Graph
        console.log('\n2️⃣ Testing P2P Graph creation...');
        const graphMetadata = await graphManager.createGraph(1, 'Test P2P Graph');
        console.log('✅ P2P Graph created:', graphMetadata.id);
        
        // Get the graph instance
        graph1 = await graphManager.getGraph(1, graphMetadata.id);
        console.log('   P2P Status:', graph1.getP2PStatus());

        // Test 3: Test P2P Graph operations
        console.log('\n3️⃣ Testing P2P Graph operations...');
        
        // Add nodes
        const node1 = await graph1.addNode('P2P Node 1', {
            description: 'First P2P node',
            type: 'concept'
        });
        console.log('✅ Node added via P2P:', node1.base_name);

        const node2 = await graph1.addNode('P2P Node 2', {
            description: 'Second P2P node',
            type: 'concept'
        });
        console.log('✅ Node added via P2P:', node2.base_name);

        // Add relation
        const relation = await graph1.addRelation(node1.id, node2.id, 'connects_to', {
            description: 'P2P relation'
        });
        console.log('✅ Relation added via P2P:', relation.name);

        // Add attribute
        const attribute = await graph1.addAttribute(node1.id, 'priority', 'high', {
            description: 'P2P attribute'
        });
        console.log('✅ Attribute added via P2P:', attribute.name);

        // Test 4: Test collaboration session
        console.log('\n4️⃣ Testing collaboration session...');
        const session = await graphManager.createCollaborationSession(
            graphMetadata.id, 
            1, 
            { maxParticipants: 6 }
        );
        console.log('✅ Collaboration session created:', session.id);

        // Join session
        await graphManager.joinCollaborationSession(session.id, 2, 'edit');
        console.log('✅ User 2 joined session with edit permissions');

        // Test 5: Test P2P networking
        console.log('\n5️⃣ Testing P2P networking...');
        
        // Get libp2p instance
        const libp2p = graph1.getLibp2pInstance();
        console.log('   Peer ID:', libp2p.peerId.toString());
        console.log('   Multiaddrs:', libp2p.getMultiaddrs().map(ma => ma.toString()));

        // Test 6: Create second graph for peer testing
        console.log('\n6️⃣ Testing peer-to-peer graph interaction...');
        const graph2Metadata = await graphManager.createGraph(2, 'Peer Graph');
        graph2 = await graphManager.getGraph(2, graph2Metadata.id);
        
        console.log('   Graph 1 Peer ID:', graph1.getLibp2pInstance().peerId.toString());
        console.log('   Graph 2 Peer ID:', graph2.getLibp2pInstance().peerId.toString());

        // Test 7: Test encryption
        console.log('\n7️⃣ Testing encryption...');
        
        // Test data encryption
        const testData = { message: 'Hello P2P World!', timestamp: Date.now() };
        const encrypted = graph1.encryptData(testData);
        console.log('✅ Data encrypted:', encrypted.encrypted.substring(0, 50) + '...');

        // Test data decryption
        const decrypted = graph1.decryptData(encrypted);
        console.log('✅ Data decrypted:', decrypted.message);

        // Test 8: Test graph listing
        console.log('\n8️⃣ Testing graph listing...');
        const user1Graphs = await graphManager.listUserGraphs(1);
        const user2Graphs = await graphManager.listUserGraphs(2);
        
        console.log('   User 1 graphs:', user1Graphs.length);
        console.log('   User 2 graphs:', user2Graphs.length);

        // Test 9: Test P2P status
        console.log('\n9️⃣ Testing P2P status...');
        console.log('   Graph 1 P2P Status:', graph1.getP2PStatus());
        console.log('   Manager P2P Status:', graphManager.getP2PStatus());

        console.log('\n🎉 All P2P Graph functionality tests completed successfully!');
        console.log(`📊 P2P Graphs created: 2`);
        console.log(`📊 Nodes created: 2`);
        console.log(`📊 Relations created: 1`);
        console.log(`📊 Attributes created: 1`);
        console.log(`📊 Collaboration sessions: 1`);
        console.log(`📊 Active peers: ${graph1.getP2PStatus().peerCount}`);

    } catch (error) {
        console.error('❌ P2P Graph test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up P2P resources...');
        
        if (graph1) {
            try {
                await graph1.cleanup();
            } catch (error) {
                console.warn('⚠️ Failed to cleanup graph1:', error.message);
            }
        }
        
        if (graph2) {
            try {
                await graph2.cleanup();
            } catch (error) {
                console.warn('⚠️ Failed to cleanup graph2:', error.message);
            }
        }
        
        if (graphManager) {
            try {
                await graphManager.cleanup();
            } catch (error) {
                console.warn('⚠️ Failed to cleanup graph manager:', error.message);
            }
        }

        // Remove test data
        try {
            const fs = await import('fs');
            if (fs.existsSync('./test_p2p_data')) {
                fs.rmSync('./test_p2p_data', { recursive: true, force: true });
            }
        } catch (error) {
            console.warn('⚠️ Failed to remove test data:', error.message);
        }

        console.log('✅ Cleanup completed');
    }
}

// Run the tests
if (import.meta.main) {
    testP2PGraph().catch(console.error);
}

export { testP2PGraph };
