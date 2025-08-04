const { HyperGraph } = require('./hyper-graph');
const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const path = require('path');

async function main() {
  const [,, command, ...args] = process.argv;

  // The 'key' command is special as it might not need to load the full graph
  if (command === 'key') {
      const core = new Hypercore(path.join(__dirname, 'hyper-db'));
      await core.ready();
      console.log('Graph key:', core.key.toString('hex'));
      return;
  }

  const graph = await HyperGraph.create();

  switch (command) {
    case 'add-node': {
      const [id, label] = args;
      if (!id || !label) {
        console.error('Usage: add-node <id> <label>');
        return;
      }
      await graph.addNode(id, label);
      console.log(`Added node: ${id} - "${label}"`);
      break;
    }

    case 'add-edge': {
      const [source, target, label] = args;
      if (!source || !target) {
        console.error('Usage: add-edge <sourceId> <targetId> [label]');
        return;
      }
      await graph.addEdge(source, target, label || '');
      console.log(`Added edge: ${source} -> ${target}`);
      break;
    }

    case 'list': {
      console.log('Key:', graph.key);
      console.log('---\n');
      console.log('Nodes:');
      const nodes = await graph.listNodes();
      if (nodes.length === 0) {
        console.log('(empty)');
      } else {
        nodes.forEach(node => console.log(`- ${node.id}: "${node.label}"`));
      }

      console.log('\nEdges:');
      const edges = await graph.listEdges();
      if (edges.length === 0) {
        console.log('(empty)');
      } else {
        edges.forEach(edge => console.log(`- ${edge.source} -> ${edge.target} (${edge.label})`));
      }
      break;
    }

    case 'listen': {
        console.log('Starting listener...');
        await graph.joinSwarm();
        console.log('Listening for connections. Press Ctrl+C to exit.');
        // Keep the process alive
        process.stdin.resume();
        process.on('SIGINT', async () => {
            await graph.leaveSwarm();
            process.exit(0);
        });
        break;
    }

    case 'sync': {
        const [key] = args;
        if (!key || key.length !== 64) {
            console.error('Usage: sync <64-character-graph-key>');
            return;
        }
        console.log(`Attempting to sync with key: ${key.slice(-6)}`);
        
        const remoteCore = new Hypercore(`./remote-${key.slice(0, 6)}`, Buffer.from(key, 'hex'));
        const swarm = new Hyperswarm();
        const topic = remoteCore.discoveryKey;

        swarm.on('connection', (socket, info) => {
            console.log('Found a peer:', info.publicKey.toString('hex').slice(-6));
            remoteCore.replicate(socket);
        });

        await swarm.join(topic, { server: false, client: true });
        await remoteCore.update();

        const bee = new Hyperbee(remoteCore, { keyEncoding: 'utf-8', valueEncoding: 'json' });
        console.log('Remote Nodes:');
        for await (const entry of bee.createReadStream({ gte: 'nodes/', lt: 'nodes0' })) {
            console.log(`- ${entry.value.id}: "${entry.value.label}"`);
        }
        
        await swarm.destroy();
        console.log('Sync complete.');
        break;
    }

    default: {
      console.log('Available commands:');
      console.log('  - key');
      console.log('  - list');
      console.log('  - listen');
      console.log('  - sync <key>');
      console.log('  - add-node <id> <label>');
      console.log('  - add-edge <sourceId> <targetId> [label]');
      return;
    }
  }
}

main().catch(error => {
  console.error('An error occurred:', error);
});
