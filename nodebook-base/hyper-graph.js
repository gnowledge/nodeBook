const Hyperbee = require('hyperbee');
const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const path = require('path');
const { PolyNode, RelationNode, AttributeNode } = require('./models');

const DB_PATH = 'hyper-db';

class HyperGraph {
  constructor(db, core) {
    this.db = db;
    this.core = core;
    this.swarm = null;
  }

  static async create(storagePath = DB_PATH, key) {
    const core = new Hypercore(path.join(__dirname, storagePath), key);
    await core.ready();
    const db = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' });
    await db.ready();
    return new HyperGraph(db, core);
  }

  get key() {
    return this.core.key.toString('hex');
  }

  // --- P2P Networking ---

  async joinSwarm() {
    this.swarm = new Hyperswarm();
    const topic = this.core.discoveryKey;
    this.swarm.on('connection', (socket) => this.core.replicate(socket));
    await this.swarm.join(topic, { server: true, client: true });
    console.log(`Swarm joined. Graph key is: ${this.key}`);
  }

  async leaveSwarm() {
    if (this.swarm) {
      console.log('Leaving swarm.');
      await this.swarm.destroy();
    }
  }

  async syncWithPeer(remoteKey) {
    console.log(`Replicating with remote key: ${remoteKey.slice(-6)}`);
    const remoteCore = new Hypercore(path.join(__dirname, `remote-${remoteKey.slice(0, 6)}`), Buffer.from(remoteKey, 'hex'), { sparse: true });
    await remoteCore.ready();
    this.swarm.join(remoteCore.discoveryKey, { server: false, client: true });
    this.swarm.flush();
    this.core.replicate(remoteCore);
  }

  // --- CRUD Operations ---

  async addNode(base_name, options = {}) {
    const node = new PolyNode(base_name, options);
    await this.db.put(`nodes/${node.id}`, node);
    return node;
  }

  async getNode(id) {
    const entry = await this.db.get(`nodes/${id}`);
    return entry ? entry.value : null;
  }

  async updateNode(id, updatedFields) {
    const node = await this.getNode(id);
    if (!node) throw new Error(`Node with ID ${id} not found.`);
    
    const updatedNode = { ...node, ...updatedFields };
    await this.db.put(`nodes/${id}`, updatedNode);
    return updatedNode;
  }

  async deleteNode(id) {
    // This is a simple deletion. A robust implementation would also clean up
    // associated edges and attributes, which can be complex.
    await this.db.del(`nodes/${id}`);
    // We should also delete all edges pointing to or from this node.
    // For now, we'll leave this as a future improvement.
    console.log(`Deleted node ${id}. Edge cleanup is not yet implemented.`);
  }

  async addRelation(source_id, target_id, name, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode || !await this.getNode(target_id)) {
      throw new Error('One or both nodes in the relation do not exist.');
    }
    const relation = new RelationNode(source_id, target_id, name, options);
    await this.db.put(`relations/${relation.id}`, relation);

    // Update the source node's active morph
    const activeMorph = sourceNode.morphs.find(m => m.morph_id === sourceNode.nbh);
    if (activeMorph && !activeMorph.relationNode_ids.includes(relation.id)) {
      activeMorph.relationNode_ids.push(relation.id);
      await this.updateNode(source_id, sourceNode);
    }

    return relation;
  }
  
  async addAttribute(source_id, attributeName, attributeValue, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode) {
        throw new Error(`Source node ${source_id} not found.`);
    }

    const attribute = new AttributeNode(source_id, attributeName, attributeValue, options);
    await this.db.put(`attributes/${attribute.id}`, attribute);

    // Update the source node's active morph
    const activeMorph = sourceNode.morphs.find(m => m.morph_id === sourceNode.nbh);
    if (activeMorph && !activeMorph.attributeNode_ids.includes(attribute.id)) {
        activeMorph.attributeNode_ids.push(attribute.id);
        await this.updateNode(source_id, sourceNode);
    }

    return attribute;
  }

  async listAll(prefix) {
    const items = [];
    for await (const entry of this.db.createReadStream({ gte: `${prefix}/`, lt: `${prefix}z` })) {
      items.push(entry.value);
    }
    return items;
  }
}

module.exports = { HyperGraph };