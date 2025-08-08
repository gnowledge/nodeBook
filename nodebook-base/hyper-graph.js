const Hyperbee = require('hyperbee');
const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const path = require('path');
const { PolyNode, RelationNode, AttributeNode, TransitionNode } = require('./models');

const DB_PATH = 'hyper-db';

class HyperGraph {
  constructor(db, core) {
    this.db = db;
    this.core = core;
    this.swarm = null;
  }

  static async create(storagePath, key) {
    const core = new Hypercore(storagePath, key);
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
    const keyToSync = remoteKey.trim();
    console.log(`Attempting to sync with remote key: ${keyToSync}`);
    if (!this.swarm) throw new Error('Swarm not initialized.');

    const remoteKeyBuf = Buffer.from(keyToSync, 'hex');
    this.swarm.join(remoteKeyBuf);
    await this.swarm.flush();

    // Provide a valid, unique path for the remote core's storage
    const remoteCorePath = path.join(__dirname, 'remotes', keyToSync.slice(0, 6));
    const remoteCore = new Hypercore(remoteCorePath, remoteKeyBuf);
    this.core.replicate(remoteCore);
  }

  getSwarmStatus() {
    if (!this.swarm) {
      return { connections: 0 };
    }
    return {
      connections: this.swarm.peers.size,
    };
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
    // Also delete all relations and attributes connected to this node
    const relations = await this.listAll('relations');
    const attributes = await this.listAll('attributes');

    for (const rel of relations) {
      if (rel.source_id === id || rel.target_id === id) {
        await this.deleteRelation(rel.id);
      }
    }
    for (const attr of attributes) {
      if (attr.source_id === id) {
        await this.deleteAttribute(attr.id);
      }
    }
    await this.db.del(`nodes/${id}`);
  }

  async deleteRelation(id) {
    const relation = (await this.db.get(`relations/${id}`))?.value;
    if (!relation) return;

    // Remove the ID from the source node's morph
    const sourceNode = await this.getNode(relation.source_id);
    if (sourceNode) {
      const activeMorph = sourceNode.morphs.find(m => m.morph_id === sourceNode.nbh);
      if (activeMorph) {
        activeMorph.relationNode_ids = activeMorph.relationNode_ids.filter(rid => rid !== id);
        await this.updateNode(sourceNode.id, sourceNode);
      }
    }
    await this.db.del(`relations/${id}`);
  }

  async deleteAttribute(id) {
    const attribute = (await this.db.get(`attributes/${id}`))?.value;
    if (!attribute) return;

    // Remove the ID from the source node's morph
    const sourceNode = await this.getNode(attribute.source_id);
    if (sourceNode) {
      const activeMorph = sourceNode.morphs.find(m => m.morph_id === sourceNode.nbh);
      if (activeMorph) {
        activeMorph.attributeNode_ids = activeMorph.attributeNode_ids.filter(aid => aid !== id);
        await this.updateNode(sourceNode.id, sourceNode);
      }
    }
    await this.db.del(`attributes/${id}`);
  }

  async addRelation(source_id, target_id, name, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode || !await this.getNode(target_id)) {
      throw new Error('One or both nodes in the relation do not exist.');
    }
    const relation = new RelationNode(source_id, target_id, name, options);
    await this.db.put(`relations/${relation.id}`, relation);

    const morphNameToUpdate = options.morph || 'basic';
    const morph = sourceNode.morphs.find(m => m.name === morphNameToUpdate);
    if (morph && !morph.relationNode_ids.includes(relation.id)) {
      morph.relationNode_ids.push(relation.id);
      await this.updateNode(source_id, { morphs: sourceNode.morphs });
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

    const morphNameToUpdate = options.morph || 'basic';
    const morph = sourceNode.morphs.find(m => m.name === morphNameToUpdate);
    if (morph && !morph.attributeNode_ids.includes(attribute.id)) {
        morph.attributeNode_ids.push(attribute.id);
        await this.updateNode(source_id, { morphs: sourceNode.morphs });
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

module.exports = HyperGraph;
