// nodebook-base/models.js

/**
 * Represents a variation or context of a PolyNode.
 * Each morph can have its own set of relations and attributes.
 */
class Morph {
    constructor(nodeId, name, morphId = null) {
        this.morph_id = morphId || `${nodeId}_morph_${Date.now()}`;
        this.node_id = nodeId;
        this.name = name;
        this.relationNode_ids = [];
        this.attributeNode_ids = [];
    }
}

/**
 * Represents a polymorphic node that can exist in multiple variations (morphs).
 */
class PolyNode {
    constructor(base_name, { id = null, adjective = null, quantifier = null, role = "individual", description = null, morphs = [], nbh = null, parent_types = [] }) {
        this.id = id || base_name.toLowerCase().replace(/\s+/g, '_');
        this.base_name = base_name;
        this.name = adjective ? `${adjective} ${base_name}` : base_name;
        this.adjective = adjective;
        this.quantifier = quantifier;
        this.role = role;
        this.description = description;
        this.parent_types = parent_types;
        this.morphs = morphs.map(m => new Morph(this.id, m.name, m.morph_id));
        
        // If no morphs are provided, create a default 'basic' morph.
        if (this.morphs.length === 0) {
            this.morphs.push(new Morph(this.id, 'basic'));
        }

        // The 'nbh' (neighborhood) points to the currently active morph_id.
        this.nbh = nbh || this.morphs[0].morph_id;
    }
}

/**
 * Represents a relation as a first-class entity, connecting two nodes.
 */
class RelationNode {
    constructor(source_id, target_id, name, { id = null, adverb = null, modality = null }) {
        this.id = id || `rel_${source_id}_${name.replace(/\s+/g, '_')}_${target_id}`;
        this.source_id = source_id;
        this.target_id = target_id;
        this.name = name;
        this.adverb = adverb;
        this.modality = modality;
    }
}

/**
 * Represents an attribute as a first-class entity, connecting a node to a value.
 * Note: In our P2P model, the 'value' is represented by the target_id of a separate value-node.
 */
class AttributeNode {
    constructor(source_id, name, value, { id = null, unit = null, adverb = null, modality = null }) {
        // Create a deterministic ID based on content
        this.id = id || `attr_${source_id}_${name.replace(/\s+/g, '_')}_${String(value).replace(/\s+/g, '_')}`;
        this.source_id = source_id;
        this.name = name; // The type of the attribute (e.g., 'color', 'height')
        this.value = value; // The literal value of the attribute
        this.unit = unit;
        this.adverb = adverb;
        this.modality = modality;
    }
}

module.exports = { PolyNode, Morph, RelationNode, AttributeNode };
