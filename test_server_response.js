#!/usr/bin/env node

// Test script to check what the server returns for graph data
import { FileSystemStore } from './nodebook-base/data-store.js';

async function testServerResponse() {
    console.log('🧪 Testing Server Response Format...\n');
    
    const dataStore = new FileSystemStore('./test-data');
    const testUserId = 'test-user-789';
    
    // Clean up any existing test data
    try {
        await dataStore.deleteGraph(testUserId, 'test-graph-response');
    } catch (e) {
        // Ignore cleanup errors
    }
    
    const cnl = `# NodeBook [individual]

<consists of> polymorphic nodes;`;

    console.log('📝 Creating graph with relation...');
    const graphId = 'test-graph-response';
    
    // Create graph
    await dataStore.createManifest(testUserId, graphId, { name: 'Test Response Graph', mode: 'richgraph' }, { username: 'test', email: 'test@example.com' });
    const graphData = await dataStore.regenerateGraphFromCnl(testUserId, graphId, cnl);
    
    console.log('📊 Raw graph data:');
    console.log('Nodes:', JSON.stringify(graphData.nodes, null, 2));
    console.log('Relations:', JSON.stringify(graphData.relations, null, 2));
    
    // Simulate what the server endpoint does
    const graph = await dataStore.createGraphObject(testUserId, graphId, graphData);
    const nodes = await graph.listAll('nodes');
    const relations = await graph.listAll('relations');
    
    console.log('\n📤 Server response format:');
    console.log('Nodes:', JSON.stringify(nodes, null, 2));
    console.log('Relations:', JSON.stringify(relations, null, 2));
    
    // Check if relations have source_id and target_id
    for (const relation of relations) {
        console.log(`\n🔍 Relation ${relation.id}:`);
        console.log(`  source_id: ${relation.source_id}`);
        console.log(`  target_id: ${relation.target_id}`);
        console.log(`  name: ${relation.name}`);
        console.log(`  JSON keys: ${Object.keys(relation).join(', ')}`);
    }
    
    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await dataStore.deleteGraph(testUserId, graphId);
    
    console.log('✅ Test completed!');
}

testServerResponse().catch(console.error);

