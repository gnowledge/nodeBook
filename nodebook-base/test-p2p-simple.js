import P2PGraphSimple from './p2p-graph-simple.js';

console.log('🧪 Testing P2P Graph Simple Functionality...\n');

async function testP2PGraphSimple() {
    let graph = null;

    try {
        // Test 1: Create P2P Graph
        console.log('1️⃣ Testing P2P Graph creation...');
        graph = await P2PGraphSimple.create('/tmp/test_p2p', 'test-p2p-graph-123');
        console.log('✅ P2P Graph created successfully');
        console.log('   Graph ID:', graph.key);
        console.log('   P2P Status:', graph.getP2PStatus());

        // Test 2: Test P2P Graph operations
        console.log('\n2️⃣ Testing P2P Graph operations...');
        
        // Add nodes
        const node1 = await graph.addNode('P2P Node 1', {
            description: 'First P2P node',
            type: 'concept'
        });
        console.log('✅ Node added via P2P:', node1.base_name);

        const node2 = await graph.addNode('P2P Node 2', {
            description: 'Second P2P node',
            type: 'concept'
        });
        console.log('✅ Node added via P2P:', node2.base_name);

        // Add relation
        const relation = await graph.addRelation(node1.id, node2.id, 'connects_to', {
            description: 'P2P relation'
        });
        console.log('✅ Relation added via P2P:', relation.name);

        // Add attribute
        const attribute = await graph.addAttribute(node1.id, 'priority', 'high', {
            description: 'P2P attribute'
        });
        console.log('✅ Attribute added via P2P:', attribute.name);

        // Test 3: Test encryption
        console.log('\n3️⃣ Testing encryption...');
        
        // Test data encryption
        const testData = { message: 'Hello P2P World!', timestamp: Date.now() };
        const encrypted = graph.encryptData(testData);
        console.log('✅ Data encrypted:', encrypted.encrypted.substring(0, 50) + '...');

        // Test data decryption
        const decrypted = graph.decryptData(encrypted);
        console.log('✅ Data decrypted:', decrypted.message);

        // Test 4: Test P2P networking
        console.log('\n4️⃣ Testing P2P networking...');
        
        // Get libp2p instance
        const libp2p = graph.getLibp2pInstance();
        console.log('   Peer ID:', libp2p.peerId.toString());
        console.log('   Multiaddrs:', libp2p.getMultiaddrs().map(ma => ma.toString()));

        // Test 5: Test graph listing
        console.log('\n5️⃣ Testing graph operations...');
        const nodes = await graph.listAll('nodes');
        const relations = await graph.listAll('relations');
        const attributes = await graph.listAll('attributes');
        
        console.log('   Nodes in graph:', nodes.length);
        console.log('   Relations in graph:', relations.length);
        console.log('   Attributes in graph:', attributes.length);

        console.log('\n🎉 All P2P Graph Simple functionality tests completed successfully!');
        console.log(`📊 P2P Graph ID: ${graph.key}`);
        console.log(`📊 Nodes created: ${nodes.length}`);
        console.log(`📊 Relations created: ${relations.length}`);
        console.log(`📊 Attributes created: ${attributes.length}`);
        console.log(`📊 P2P Status: ${graph.getP2PStatus().isInitialized ? '🟢 Initialized' : '🔴 Not initialized'}`);

    } catch (error) {
        console.error('❌ P2P Graph Simple test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    } finally {
        // Cleanup
        console.log('\n🧹 Cleaning up P2P resources...');
        
        if (graph) {
            try {
                await graph.cleanup();
            } catch (error) {
                console.warn('⚠️ Failed to cleanup graph:', error.message);
            }
        }

        console.log('✅ Cleanup completed');
    }
}

// Run the tests
if (import.meta.main) {
    testP2PGraphSimple().catch(console.error);
}

export { testP2PGraphSimple };
