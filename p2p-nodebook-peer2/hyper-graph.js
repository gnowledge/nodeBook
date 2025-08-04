const Hyperbee = require('hyperbee');
const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const path = require('path');

// Store hypercore data in a subdirectory
const DB_PATH = 'hyper-db';

class HyperGraph {
  constructor(db, core) {
    this.db = db;
    this.core = core;
    this.swarm = null;
  }

  static async create() {
    // The core is the underlying log
    const core = new Hypercore(path.join(__dirname, DB_PATH));
    await core.ready();

    // The bee is a key-value store built on the log
    const db = new Hyperbee(core, {
      keyEncoding: 'utf-8',
      valueEncoding: 'json'
    });
    await db.ready();

    return new HyperGraph(db, core);
  }

  get key() {
      return this.core.key.toString('hex');
  }

  async joinSwarm() {
    this.swarm = new Hyperswarm();

    // The "topic" is a 32-byte buffer that we can derive from the core's public key
    const topic = this.core.discoveryKey;

    this.swarm.on('connection', (socket, info) => {
      console.log('Found a peer:', info.publicKey.toString('hex').slice(-6));
      
      // Replicate the hypercore with the new peer
      this.core.replicate(socket);
    });

    // Announce the topic to the swarm
    await this.swarm.join(topic, {
      server: true, // We can connect to other peers
      client: true  // Other peers can connect to us
    });

    console.log(`Swarm joined. Looking for peers for topic: ${topic.toString('hex').slice(-6)}`);
    console.log(`Graph key is: ${this.key}`);
  }

  async leaveSwarm() {
      if (this.swarm) {
          await this.swarm.leave(this.core.discoveryKey);
          await this.swarm.destroy();
          this.swarm = null;
          console.log('Swarm left.');
      }
  }

  async addNode(id, label, attributes = {}) {
    const node = { id, label, attributes };
    // Use a structured key, e.g., 'nodes/user1'
    await this.db.put(`nodes/${id}`, node);
  }

  async getNode(id) {
    const entry = await this.db.get(`nodes/${id}`);
    return entry ? entry.value : null;
  }

  async addEdge(sourceId, targetId, label = '', attributes = {}) {
    // Basic check to see if nodes exist
    if (!await this.getNode(sourceId) || !await this.getNode(targetId)) {
        throw new Error('One or both nodes in the edge do not exist.');
    }
    const edge = { source: sourceId, target: targetId, label, attributes };
    // Edges can be stored with a key that includes both nodes
    await this.db.put(`edges/${sourceId}/${targetId}`, edge);
  }

  async listNodes() {
    const nodes = [];
    // Use the sub-namespace 'nodes' to iterate
    for await (const entry of this.db.createReadStream({ gte: 'nodes/', lt: 'nodes0' })) {
        nodes.push(entry.value);
    }
    return nodes;
  }

  async listEdges() {
    const edges = [];
    // Use the sub-namespace 'edges' to iterate
    for await (const entry of this.db.createReadStream({ gte: 'edges/', lt: 'edges0' })) {
        edges.push(entry.value);
    }
    return edges;
  }

  // We can add import/export later
}

module.exports = { HyperGraph };
