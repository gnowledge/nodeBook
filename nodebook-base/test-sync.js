const { HyperGraph } = require('./hyper-graph');

async function testSync() {
  console.log('--- Test: P2P Sync Simulation ---');

  // 1. Create Peer A (will have the initial data)
  // We need to give it a unique storage path
  const graphA = await HyperGraph.create('./db-peer-a');
  console.log('Peer A created. Key:', graphA.key.slice(-6));

  // 2. Add some data to Peer A
  await graphA.addNode('node1', 'Hello from A');
  await graphA.addNode('node2', 'Another node from A');
  await graphA.addEdge('node1', 'node2', 'connects');
  console.log('Added data to Peer A.');

  // 3. Create Peer B (will be empty initially)
  // It will sync with Peer A using its key
  const graphB = await HyperGraph.create('./db-peer-b', graphA.key);
  console.log('Peer B created. It will sync with key:', graphA.key.slice(-6));

  // 4. Simulate replication
  // This is what hyperswarm does when it finds a peer.
  // We connect the two cores' replication streams directly.
  console.log('\nSimulating replication...');
  const streamA = graphA.core.replicate(true);
  const streamB = graphB.core.replicate(false);
  streamA.pipe(streamB).pipe(streamA);

  // Give it a moment to sync
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('Replication complete.');

  // 5. Verify Peer B has the data
  console.log('\n--- Verifying Peer B Data ---');
  const nodesB = await graphB.listNodes();
  const edgesB = await graphB.listEdges();

  console.log('Nodes on Peer B:');
  nodesB.forEach(n => console.log(`- ${n.id}: "${n.label}"`));

  console.log('Edges on Peer B:');
  edgesB.forEach(e => console.log(`- ${e.source} -> ${e.target}`));

  // 6. Clean up the test databases
  const fs = require('fs').promises;
  await fs.rm('./db-peer-a', { recursive: true, force: true });
  await fs.rm('./db-peer-b', { recursive: true, force: true });
  console.log('\nCleanup complete.');

  if (nodesB.length === 2 && edgesB.length === 1) {
    console.log('\n✅ Test Passed: Sync was successful!');
  } else {
    console.log('\n❌ Test Failed: Data did not sync correctly.');
  }
}

// We need to modify HyperGraph.create to accept a path and key
async function patchHyperGraph() {
    const fs = require('fs');
    let content = fs.readFileSync('./hyper-graph.js', 'utf8');
    content = content.replace(
        `static async create() {
    // The core is the underlying log
    const core = new Hypercore(path.join(__dirname, DB_PATH));`,
        `static async create(storagePath = DB_PATH, key) {
    // The core is the underlying log
    const core = new Hypercore(path.join(__dirname, storagePath), key);`
    );
    fs.writeFileSync('./hyper-graph.js', content);
}

async function run() {
    await patchHyperGraph();
    await testSync();
}

run().catch(console.error);
