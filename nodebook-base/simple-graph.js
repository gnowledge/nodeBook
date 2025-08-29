const { PolyNode, RelationNode, AttributeNode, FunctionNode } = require('./models');
const { evaluate } = require('mathjs');

class SimpleGraph {
  constructor(storagePath) {
    this.storagePath = storagePath;
    this.db = new Map(); // Simple in-memory storage for now
    this.collaborators = new Map(); // Track active collaborators
    this.shareLinks = new Map(); // Track share links and permissions
    this.graphId = this.generateGraphId();
  }

  static async create(storagePath, key) {
    // For now, we'll create a simple graph without complex P2P setup
    return new SimpleGraph(storagePath);
  }

  get key() {
    return this.graphId;
  }

  // Simple collaboration methods
  async createShareLink(permissions = { edit: false, view: true }) {
    const shareId = this.generateShareId();
    const shareLink = {
      id: shareId,
      permissions,
      createdAt: new Date(),
      expiresAt: null // Permanent until revoked
    };
    
    this.shareLinks.set(shareId, shareLink);
    return shareLink;
  }

  async revokeShareLink(shareId) {
    this.shareLinks.delete(shareId);
  }

  async addCollaborator(shareId, userId, permissions) {
    const shareLink = this.shareLinks.get(shareId);
    if (!shareLink) {
      throw new Error('Share link not found');
    }

    this.collaborators.set(userId, {
      shareId,
      permissions,
      joinedAt: new Date()
    });

    console.log(`Collaborator ${userId} joined with permissions:`, permissions);
    return true;
  }

  async removeCollaborator(userId) {
    this.collaborators.delete(userId);
    console.log(`Collaborator ${userId} left`);
    return true;
  }

  generateShareId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  generateGraphId() {
    return 'graph_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
  }

  // Graph operations - maintaining the same interface as HyperGraph
  async addNode(base_name, options = {}) {
    const node = new PolyNode(base_name, options);
    this.db.set(`nodes/${node.id}`, node);
    
    console.log(`Node added: ${node.base_name} (${node.id})`);
    return node;
  }

  async getNode(id) {
    return this.db.get(`nodes/${id}`);
  }

  async deleteNode(id) {
    const node = await this.getNode(id);
    if (node) {
      const updatedNode = { ...node, isDeleted: true };
      this.db.set(`nodes/${id}`, updatedNode);
      console.log(`Node deleted: ${id}`);
    }
  }

  async updateNode(id, updatedFields) {
    const node = await this.getNode(id);
    if (!node) throw new Error(`Node with ID ${id} not found.`);
    
    const updatedNode = { ...node, ...updatedFields };
    this.db.set(`nodes/${id}`, updatedNode);
    
    console.log(`Node updated: ${id}`, updatedFields);
    return updatedNode;
  }

  async addRelation(source_id, target_id, name, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode || !await this.getNode(target_id)) {
      throw new Error('One or both nodes in the relation do not exist.');
    }
    
    const relation = new RelationNode(source_id, target_id, name, options);
    this.db.set(`relations/${relation.id}`, relation);

    const morphName = options.morph || 'basic';
    const morph = sourceNode.morphs.find(m => m.name === morphName);
    if (morph) {
      if (!morph.relationNode_ids.includes(relation.id)) {
        morph.relationNode_ids.push(relation.id);
        await this.updateNode(source_id, { morphs: sourceNode.morphs });
      }
      relation.morph_ids.push(morph.morph_id);
      this.db.set(`relations/${relation.id}`, relation);
    }
    
    console.log(`Relation added: ${source_id} -> ${target_id} (${name})`);
    return relation;
  }

  async deleteRelation(id) {
    const relation = await this.db.get(`relations/${id}`);
    if (relation) {
      const updatedRelation = { ...relation, isDeleted: true };
      this.db.set(`relations/${id}`, updatedRelation);
      console.log(`Relation deleted: ${id}`);
    }
  }

  async addAttribute(source_id, attributeName, attributeValue, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode) throw new Error(`Source node ${source_id} not found.`);
    
    const attribute = new AttributeNode(source_id, attributeName, attributeValue, options);
    this.db.set(`attributes/${attribute.id}`, attribute);

    const morphName = options.morph || 'basic';
    const morph = sourceNode.morphs.find(m => m.name === morphName);
    if (morph) {
      if (!morph.attributeNode_ids.includes(attribute.id)) {
        morph.attributeNode_ids.push(attribute.id);
        await this.updateNode(source_id, { morphs: sourceNode.morphs });
      }
      attribute.morph_ids.push(morph.morph_id);
      this.db.set(`attributes/${attribute.id}`, attribute);
    }
    
    console.log(`Attribute added: ${attributeName} = ${attributeValue} to node ${source_id}`);
    return attribute;
  }

  async deleteAttribute(id) {
    const attribute = await this.db.get(`attributes/${id}`);
    if (attribute) {
      const updatedAttribute = { ...attribute, isDeleted: true };
      this.db.set(`attributes/${id}`, updatedAttribute);
      console.log(`Attribute deleted: ${id}`);
    }
  }

  async applyFunction(source_id, name, expression, options = {}) {
    const sourceNode = await this.getNode(source_id);
    if (!sourceNode) throw new Error(`Source node ${source_id} not found.`);

    const allAttributes = Array.from(this.db.values()).filter(item => 
      item.source_id === source_id && item.constructor === AttributeNode
    );
    
    const scope = {};
    let sanitizedExpression = expression;

    const sortedAttributes = [...allAttributes].sort((a, b) => b.name.length - a.name.length);

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
      console.log(`Function applied: ${name} = ${value} on node ${source_id}`);
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
      console.log(`Morph added: ${morph.name} to node ${nodeId}`);
    }
  }

  async listAll(prefix) {
    const items = [];
    for (const [key, value] of this.db.entries()) {
      if (key.startsWith(prefix + '/')) {
        items.push(value);
      }
    }
    return items;
  }

  async getCollaborationStatus() {
    return {
      graphId: this.graphId,
      collaborators: Array.from(this.collaborators.entries()).map(([userId, data]) => ({
        userId,
        permissions: data.permissions,
        joinedAt: data.joinedAt
      })),
      shareLinks: Array.from(this.shareLinks.entries()).map(([id, link]) => ({
        id,
        permissions: link.permissions,
        createdAt: link.createdAt
      }))
    };
  }

  async destroy() {
    // Cleanup resources
    this.db.clear();
    this.collaborators.clear();
    this.shareLinks.clear();
    console.log(`Graph ${this.graphId} destroyed`);
  }
}

module.exports = SimpleGraph;
