const Hyperbee = require('hyperbee');
const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const path = require('path');
const { PolyNode, RelationNode, AttributeNode, FunctionNode } = require('./models');
const { evaluate } = require('mathjs');

class HyperGraph {
  constructor(db, core, storagePath) {
    this.db = db;
    this.core = core;
    this.storagePath = storagePath; // Store the storage path
    this.swarm = null;
  }

  static async create(storagePath, key) {
    const core = new Hypercore(storagePath, key);
    await core.ready();
    const db = new Hyperbee(core, { keyEncoding: 'utf-8', valueEncoding: 'json' });
    await db.ready();
    return new HyperGraph(db, core, storagePath); // Pass storagePath to constructor
  }

  get key() {
    return this.core.key.toString('hex');
  }

  async joinSwarm() {
    this.swarm = new Hyperswarm();
    const topic = this.core.discoveryKey;
    this.swarm.on('connection', (socket) => this.core.replicate(socket));
    await this.swarm.join(topic, { server: true, client: true });
  }

  async syncWithPeer(remoteKey) {
    const keyToSync = remoteKey.trim();
    const remoteKeyBuf = Buffer.from(keyToSync, 'hex');
    this.swarm.join(remoteKeyBuf);
    await this.swarm.flush();
    // Use the stored storagePath to create the remote core
    const remoteCore = new Hypercore(path.join(this.storagePath, 'remotes', keyToSync.slice(0, 6)), remoteKeyBuf);
    this.core.replicate(remoteCore);
  }

  getSwarmStatus() {
    return { connections: this.swarm ? this.swarm.peers.size : 0 };
  }

  async leaveSwarm() {
    if (this.swarm) {
      await this.swarm.destroy();
      this.swarm = null;
    }
  }

  async addNode(base_name, options = {}) {
    const node = new PolyNode(base_name, options);
    await this.db.put(`nodes/${node.id}`, node);
    return node;
  }

  async getNode(id) {
    const entry = await this.db.get(`nodes/${id}`);
    return entry ? entry.value : null;
  }

  async deleteNode(id) {
    const node = await this.getNode(id);
    if (node) {
      await this.updateNode(id, { isDeleted: true });
    }
  }

  async updateNode(id, updatedFields) {
    const node = await this.getNode(id);
    if (!node) throw new Error(`Node with ID ${id} not found.`);
    const updatedNode = { ...node, ...updatedFields };
    await this.db.put(`nodes/${id}`, updatedNode);
    return updatedNode;
  }

  async addRelation(source_id, target_id, name, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode || !await this.getNode(target_id)) {
      throw new Error('One or both nodes in the relation do not exist.');
    }
    const relation = new RelationNode(source_id, target_id, name, options);
    await this.db.put(`relations/${relation.id}`, relation);

    const morphName = options.morph || 'basic';
    const morph = sourceNode.morphs.find(m => m.name === morphName);
    if (morph) {
      if (!morph.relationNode_ids.includes(relation.id)) {
        morph.relationNode_ids.push(relation.id);
        await this.updateNode(source_id, { morphs: sourceNode.morphs });
      }
      relation.morph_ids.push(morph.morph_id);
      await this.db.put(`relations/${relation.id}`, relation);
    }
    return relation;
  }

  async deleteRelation(id) {
    const relEntry = await this.db.get(`relations/${id}`);
    if (relEntry) {
        const updatedRelation = { ...relEntry.value, isDeleted: true };
        await this.db.put(`relations/${id}`, updatedRelation);
    }
  }
  
  async addAttribute(source_id, attributeName, attributeValue, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode) throw new Error(`Source node ${source_id} not found.`);
    const attribute = new AttributeNode(source_id, attributeName, attributeValue, options);
    await this.db.put(`attributes/${attribute.id}`, attribute);

    const morphName = options.morph || 'basic';
    const morph = sourceNode.morphs.find(m => m.name === morphName);
    if (morph) {
        if (!morph.attributeNode_ids.includes(attribute.id)) {
            morph.attributeNode_ids.push(attribute.id);
            await this.updateNode(source_id, { morphs: sourceNode.morphs });
        }
        attribute.morph_ids.push(morph.morph_id);
        await this.db.put(`attributes/${attribute.id}`, attribute);
    }
    return attribute;
  }

  async deleteAttribute(id) {
    const attrEntry = await this.db.get(`attributes/${id}`);
    if (attrEntry) {
        const updatedAttribute = { ...attrEntry.value, isDeleted: true };
        await this.db.put(`attributes/${id}`, updatedAttribute);
    }
  }

  async applyFunction(source_id, name, expression, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode) throw new Error(`Source node ${source_id} not found.`);

    const allAttributes = await this.listAll('attributes');
    const nodeAttributes = allAttributes.filter(attr => attr.source_id === source_id);
    
    const scope = {};
    let sanitizedExpression = expression;

    const sortedAttributes = [...nodeAttributes].sort((a, b) => b.name.length - a.name.length);

    for (const attr of sortedAttributes) {
      const numericValue = parseFloat(attr.value);
      const sanitizedName = attr.name.replace(/\s+/g, '_');
      scope[sanitizedName] = isNaN(numericValue) ? attr.value : numericValue;
      
      sanitizedExpression = sanitizedExpression.replace(new RegExp(`"${attr.name}"`, 'g'), sanitizedName);
    }

    try {
      const value = evaluate(sanitizedExpression, scope);
      const func = new FunctionNode(source_id, name, value, expression, options);
      await this.addAttribute(source_id, name, value, { ...options, isDerived: true });
      return func;
    } catch (error) {
      console.error(`Error evaluating function "${name}" for node "${source_id}":`, error);
      return null;
    }
  }

  async addMorph(nodeId, morph) {
    const node = await this.getNode(nodeId);
    if (!node) return;
    const morphExists = node.morphs.some(m => m.name === morph.name);
    if (!morphExists) {
      node.morphs.push(morph);
      await this.updateNode(nodeId, { morphs: node.morphs });
    }
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