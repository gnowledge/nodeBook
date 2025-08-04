class Node {
  constructor(id, label, attributes = {}) {
    this.id = id;
    this.label = label;
    this.attributes = attributes;
  }
}

class Edge {
  constructor(source, target, label = '', attributes = {}) {
    this.source = source;
    this.target = target;
    this.label = label;
    this.attributes = attributes;
  }
}

class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
  }

  addNode(id, label, attributes) {
    if (this.nodes.has(id)) {
      throw new Error(`Node with ID ${id} already exists.`);
    }
    const node = new Node(id, label, attributes);
    this.nodes.set(id, node);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  addEdge(sourceId, targetId, label, attributes) {
    if (!this.nodes.has(sourceId)) {
      throw new Error(`Source node with ID ${sourceId} not found.`);
    }
    if (!this.nodes.has(targetId)) {
      throw new Error(`Target node with ID ${targetId} not found.`);
    }
    const edge = new Edge(sourceId, targetId, label, attributes);
    this.edges.push(edge);
    return edge;
  }

  listNodes() {
    return Array.from(this.nodes.values());
  }

  listEdges() {
    return this.edges;
  }

  // Basic serialization to a plain object
  toJSON() {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: this.edges,
    };
  }

  // Basic deserialization from a plain object
  static fromJSON(json) {
    const graph = new Graph();
    if (json.nodes) {
      for (const nodeData of json.nodes) {
        graph.addNode(nodeData.id, nodeData.label, nodeData.attributes);
      }
    }
    if (json.edges) {
      for (const edgeData of json.edges) {
        graph.addEdge(edgeData.source, edgeData.target, edgeData.label, edgeData.attributes);
      }
    }
    return graph;
  }
}

module.exports = { Graph };
