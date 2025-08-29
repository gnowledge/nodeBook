const { createLibp2p } = require('libp2p');
const { websockets } = require('@libp2p/websockets');
const { noise } = require('@libp2p/noise');
const { peerIdFromString } = require('@libp2p/peer-id');
const { identify } = require('@libp2p/identify');
const { ping } = require('@libp2p/ping');
const { gossipsub } = require('@libp2p/pubsub');
const path = require('path');
const fs = require('fs').promises;
const { PolyNode, RelationNode, AttributeNode, FunctionNode } = require('./models');
const { evaluate } = require('mathjs');

class LibP2PGraph {
  constructor(db, libp2p, storagePath) {
    this.db = db;
    this.libp2p = libp2p;
    this.storagePath = storagePath;
    this.collaborators = new Map(); // Track active collaborators
    this.shareLinks = new Map(); // Track share links and permissions
  }

  static async create(storagePath, key) {
    // Create libp2p node
    const libp2p = await createLibp2p({
      addresses: {
        listen: [
          '/ip4/0.0.0.0/tcp/0',
          '/ip4/0.0.0.0/tcp/0/ws'
        ]
      },
      transports: [
        websockets()
      ],
      connectionEncryption: [
        noise()
      ],
      services: {
        identify: identify(),
        ping: ping(),
        pubsub: gossipsub({
          allowPublishToZeroPeers: true,
          emitSelf: false
        })
      }
    });

    // Start the libp2p node
    await libp2p.start();

    // Create a simple in-memory database for now (we'll replace this with proper storage later)
    const db = new Map();

    return new LibP2PGraph(db, libp2p, storagePath);
  }

  get key() {
    return this.libp2p.peerId.toString();
  }

  async joinCollaboration(topic) {
    // Subscribe to collaboration topic
    await this.libp2p.services.pubsub.subscribe(topic, (message) => {
      this.handleCollaborationMessage(message);
    });
  }

  async leaveCollaboration(topic) {
    // Unsubscribe from collaboration topic
    await this.libp2p.services.pubsub.unsubscribe(topic);
  }

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

  async addCollaborator(shareId, peerId, permissions) {
    const shareLink = this.shareLinks.get(shareId);
    if (!shareLink) {
      throw new Error('Share link not found');
    }

    this.collaborators.set(peerId, {
      shareId,
      permissions,
      joinedAt: new Date()
    });

    // Notify other collaborators
    await this.broadcastCollaborationUpdate('collaborator_joined', {
      peerId,
      permissions
    });
  }

  async removeCollaborator(peerId) {
    this.collaborators.delete(peerId);
    
    // Notify other collaborators
    await this.broadcastCollaborationUpdate('collaborator_left', {
      peerId
    });
  }

  async broadcastCollaborationUpdate(type, data) {
    const topic = `collaboration:${this.key}`;
    const message = {
      type,
      data,
      timestamp: Date.now(),
      sender: this.libp2p.peerId.toString()
    };

    await this.libp2p.services.pubsub.publish(topic, JSON.stringify(message));
  }

  handleCollaborationMessage(message) {
    try {
      const data = JSON.parse(message.data.toString());
      
      switch (data.type) {
        case 'collaborator_joined':
          console.log(`Collaborator joined: ${data.data.peerId}`);
          break;
        case 'collaborator_left':
          console.log(`Collaborator left: ${data.data.peerId}`);
          break;
        case 'graph_update':
          this.handleGraphUpdate(data.data);
          break;
        default:
          console.log(`Unknown message type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error handling collaboration message:', error);
    }
  }

  handleGraphUpdate(updateData) {
    // Handle real-time graph updates from collaborators
    // This will be implemented when we add the graph data layer
    console.log('Graph update received:', updateData);
  }

  generateShareId() {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  // Graph operations - maintaining the same interface as HyperGraph
  async addNode(base_name, options = {}) {
    const node = new PolyNode(base_name, options);
    this.db.set(`nodes/${node.id}`, node);
    
    // Broadcast the update to collaborators
    await this.broadcastCollaborationUpdate('graph_update', {
      operation: 'add_node',
      node
    });
    
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
      
      // Broadcast the update
      await this.broadcastCollaborationUpdate('graph_update', {
        operation: 'delete_node',
        nodeId: id
      });
    }
  }

  async updateNode(id, updatedFields) {
    const node = await this.getNode(id);
    if (!node) throw new Error(`Node with ID ${id} not found.`);
    
    const updatedNode = { ...node, ...updatedFields };
    this.db.set(`nodes/${id}`, updatedNode);
    
    // Broadcast the update
    await this.broadcastCollaborationUpdate('graph_update', {
      operation: 'update_node',
      nodeId: id,
      updates: updatedFields
    });
    
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
    
    // Broadcast the update
    await this.broadcastCollaborationUpdate('graph_update', {
      operation: 'add_relation',
      relation
    });
    
    return relation;
  }

  async deleteRelation(id) {
    const relation = await this.db.get(`relations/${id}`);
    if (relation) {
      const updatedRelation = { ...relation, isDeleted: true };
      this.db.set(`relations/${id}`, updatedRelation);
      
      // Broadcast the update
      await this.broadcastCollaborationUpdate('graph_update', {
        operation: 'delete_relation',
        relationId: id
      });
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
    
    // Broadcast the update
    await this.broadcastCollaborationUpdate('graph_update', {
      operation: 'add_attribute',
      attribute
    });
    
    return attribute;
  }

  async deleteAttribute(id) {
    const attribute = await this.db.get(`attributes/${id}`);
    if (attribute) {
      const updatedAttribute = { ...attribute, isDeleted: true };
      this.db.set(`attributes/${id}`, updatedAttribute);
      
      // Broadcast the update
      await this.broadcastCollaborationUpdate('graph_update', {
        operation: 'delete_attribute',
        attributeId: id
      });
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
    for (const [key, value] of this.db.entries()) {
      if (key.startsWith(prefix + '/')) {
        items.push(value);
      }
    }
    return items;
  }

  async getCollaborationStatus() {
    return {
      peerId: this.libp2p.peerId.toString(),
      collaborators: Array.from(this.collaborators.entries()).map(([peerId, data]) => ({
        peerId,
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
    if (this.libp2p) {
      await this.libp2p.stop();
    }
  }
}

module.exports = LibP2PGraph;
