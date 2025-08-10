const crypto = require('crypto');

class PolyNode {
  constructor(base_name, options = {}) {
    this.id = options.id || base_name.toLowerCase().replace(/\s+/g, '_');
    this.base_name = base_name;
    this.name = options.adjective ? `${options.adjective} ${base_name}` : base_name;
    this.adjective = options.adjective || null;
    this.quantifier = options.quantifier || null;
    this.role = options.role || 'individual';
    this.description = options.description || null;
    this.parent_types = options.parent_types || [];
    this.isDeleted = false;
    this.morphs = [{
      morph_id: `${this.id}_morph_${Date.now()}`,
      node_id: this.id,
      name: 'basic',
      relationNode_ids: [],
      attributeNode_ids: []
    }];
    this.nbh = this.morphs[0].morph_id;
  }
}

class RelationNode {
  constructor(source_id, target_id, name, options = {}) {
    this.id = `rel_${source_id}_${name.toLowerCase().replace(/\s+/g, '_')}_${target_id}`;
    this.source_id = source_id;
    this.target_id = target_id;
    this.name = name;
    this.adverb = options.adverb || null;
    this.modality = options.modality || null;
    this.morph_ids = [];
    this.isDeleted = false;
  }
}

class AttributeNode {
  constructor(source_id, name, value, options = {}) {
    const valueHash = crypto.createHash('sha1').update(String(value)).digest('hex').slice(0, 6);
    this.id = `attr_${source_id}_${name.toLowerCase().replace(/\s+/g, '_')}_${valueHash}`;
    this.source_id = source_id;
    this.name = name;
    this.value = value;
    this.adverb = options.adverb || null;
    this.unit = options.unit || null;
    this.modality = options.modality || null;
    this.morph_ids = [];
    this.isDeleted = false;
  }
}

class FunctionNode extends AttributeNode {
  constructor(source_id, name, value, expression, options = {}) {
    super(source_id, name, value, options);
    this.expression = expression;
    this.isDerived = true;
  }
}

module.exports = { PolyNode, RelationNode, AttributeNode, FunctionNode };