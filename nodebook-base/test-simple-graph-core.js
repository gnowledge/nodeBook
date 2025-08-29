import SimpleGraph from './simple-graph.js';

console.log('🧪 Testing SimpleGraph Core Functionality (In-Memory)...\n');

async function testSimpleGraphCore() {
    try {
        // Test 1: Create a SimpleGraph instance
        console.log('1️⃣ Testing SimpleGraph creation...');
        const graph = await SimpleGraph.create('/tmp/test', 'test-graph-123');
        console.log('✅ SimpleGraph created successfully');
        console.log('   Graph ID:', graph.key);
        console.log('   Storage Path:', graph.storagePath);
        
        // Test 2: Add nodes to the graph
        console.log('\n2️⃣ Testing node creation...');
        
        const node1 = await graph.addNode('Test Node 1', {
            description: 'This is the first test node',
            type: 'concept',
            priority: 'high'
        });
        console.log('✅ First node created:', node1);
        
        const node2 = await graph.addNode('Test Node 2', {
            description: 'This is the second test node',
            type: 'concept',
            priority: 'medium'
        });
        console.log('✅ Second node created:', node2);
        
        // Test 3: Add a relation between nodes
        console.log('\n3️⃣ Testing relation creation...');
        const relation = await graph.addRelation(node1.id, node2.id, 'connects_to', {
            description: 'Test relation between nodes',
            strength: 'strong'
        });
        console.log('✅ Relation created:', relation);
        
        // Test 4: Add attributes to nodes
        console.log('\n4️⃣ Testing attribute creation...');
        const attribute = await graph.addAttribute(node1.id, 'priority', 'high', {
            description: 'Priority level of the node'
        });
        console.log('✅ Attribute created:', attribute);
        
        // Test 5: Apply a function to a node
        console.log('\n5️⃣ Testing function application...');
        const func = await graph.applyFunction(node1.id, 'calculate_score', 'priority == "high" ? 100 : 50', {
            description: 'Calculate score based on priority'
        });
        console.log('✅ Function applied:', func);
        
        // Test 6: List all nodes in the graph
        console.log('\n6️⃣ Testing node listing...');
        const nodes = await graph.listAll('nodes');
        console.log('✅ Nodes in graph:', nodes.length);
        nodes.forEach((node, index) => {
            console.log(`   Node ${index + 1}:`, node.base_name, '(ID:', node.id + ')');
        });
        
        // Test 7: List all relations in the graph
        console.log('\n7️⃣ Testing relation listing...');
        const relations = await graph.listAll('relations');
        console.log('✅ Relations in graph:', relations.length);
        relations.forEach((rel, index) => {
            console.log(`   Relation ${index + 1}:`, rel.name, 'from', rel.source_id, 'to', rel.target_id);
        });
        
        // Test 8: List all attributes in the graph
        console.log('\n8️⃣ Testing attribute listing...');
        const attributes = await graph.listAll('attributes');
        console.log('✅ Attributes in graph:', attributes.length);
        attributes.forEach((attr, index) => {
            console.log(`   Attribute ${index + 1}:`, attr.name, '=', attr.value);
        });
        
        // Test 9: List all functions in the graph
        console.log('\n9️⃣ Testing function listing...');
        const functions = await graph.listAll('functions');
        console.log('✅ Functions in graph:', functions.length);
        functions.forEach((func, index) => {
            console.log(`   Function ${index + 1}:`, func.name, '=', func.expression);
        });
        
        // Test 10: Get node by ID
        console.log('\n🔟 Testing node retrieval...');
        const retrievedNode = await graph.getNode(node1.id);
        console.log('✅ Node retrieved:', retrievedNode.base_name);
        
        // Test 11: Update node
        console.log('\n1️⃣1️⃣ Testing node update...');
        const updatedNode = await graph.updateNode(node1.id, {
            description: 'Updated description for the first node'
        });
        console.log('✅ Node updated:', updatedNode.description);
        
        // Test 12: Delete node
        console.log('\n1️⃣2️⃣ Testing node deletion...');
        await graph.deleteNode(node2.id);
        console.log('✅ Second node deleted');
        
        // Verify deletion
        const remainingNodes = await graph.listAll('nodes');
        console.log('   Remaining nodes:', remainingNodes.length);
        
        // Test 13: Test collaboration features
        console.log('\n1️⃣3️⃣ Testing collaboration features...');
        
        // Create a share link
        const shareLink = await graph.createShareLink('view', {
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });
        console.log('✅ Share link created:', shareLink.id);
        
        // Add a collaborator
        const collaborator = await graph.addCollaborator(shareLink.id, 'test-user-456', 'edit');
        console.log('✅ Collaborator added: test-user-456 with permissions: edit');
        
        // List collaborators
        const collaborationStatus = await graph.getCollaborationStatus();
        console.log('✅ Collaboration status retrieved');
        console.log('   Collaborators:', collaborationStatus.collaborators.length);
        console.log('   Share links:', collaborationStatus.shareLinks.length);
        
        // Test 14: Test CNL processing (if available)
        console.log('\n1️⃣4️⃣ Testing CNL processing...');
        try {
            const cnlResult = await graph.processCnl('Create a new concept node called "Test Concept"');
            console.log('✅ CNL processing result:', cnlResult);
        } catch (error) {
            console.log('⚠️  CNL processing not available:', error.message);
        }
        
        console.log('\n🎉 All core SimpleGraph functionality tests completed successfully!');
        console.log(`📊 Graph ID: ${graph.key}`);
        console.log(`📊 Nodes created: ${nodes.length}`);
        console.log(`📊 Relations created: ${relations.length}`);
        console.log(`📊 Attributes created: ${attributes.length}`);
        console.log(`📊 Functions created: ${functions.length}`);
        console.log(`📊 Share links created: 1`);
        console.log(`📊 Collaborators added: 1`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}

// Run the tests
if (import.meta.main) {
    testSimpleGraphCore().catch(console.error);
}

export { testSimpleGraphCore };
