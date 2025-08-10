const Hyperbee = require('hyperbee');
const Hypercore = require('hypercore');
const Hyperswarm = require('hyperswarm');
const path = require('path');
const { PolyNode, RelationNode, AttributeNode, FunctionNode } = require('./models');
const { evaluate } = require('mathjs');

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
    const remoteCore = new Hypercore(path.join(__dirname, 'remotes', keyToSync.slice(0, 6)), remoteKeyBuf);
    this.core.replicate(remoteCore);
  }

  getSwarmStatus() {
    return { connections: this.swarm ? this.swarm.peers.size : 0 };
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
    await this.db.del(`nodes/${id}`);
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

  async applyFunction(source_id, name, expression, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode) throw new Error(`Source node ${source_id} not found.`);

    const allAttributes = await this.listAll('attributes');
    const nodeAttributes = allAttributes.filter(attr => attr.source_id === source_id);
    
    const scope = {};
    let sanitizedExpression = expression;

    for (const attr of nodeAttributes) {
      const numericValue = parseFloat(attr.value);
      const sanitizedName = attr.name.replace(/\s+/g, '_');
      scope[sanitizedName] = isNaN(numericValue) ? attr.value : numericValue;
      
      // Replace the quoted attribute name in the expression with the sanitized name
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
