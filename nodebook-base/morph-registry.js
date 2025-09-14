/**
 * Morph Registry - Efficient lookup system for morph management
 * 
 * This registry provides O(1) lookups for:
 * - Which node a morph belongs to
 * - Which relations and attributes belong to a morph
 * - Fast filtering for visualization
 */

export class MorphRegistry {
    constructor() {
        // Primary registry: morphId -> morph data
        this.morphs = new Map();
        
        // Reverse lookup: nodeId -> array of morphIds
        this.nodeMorphs = new Map();
        
        // Relation tracking: relationId -> array of morphIds that use it
        this.relationMorphs = new Map();
        
        // Attribute tracking: attributeId -> array of morphIds that use it
        this.attributeMorphs = new Map();
    }

    /**
     * Add a morph to the registry
     * @param {string} morphId - Unique morph identifier
     * @param {string} nodeId - Node this morph belongs to
     * @param {string} morphName - Human-readable morph name
     * @param {Array} relationIds - Array of relation IDs in this morph
     * @param {Array} attributeIds - Array of attribute IDs in this morph
     */
    addMorph(morphId, nodeId, morphName, relationIds = [], attributeIds = []) {
        const morphData = {
            morphId,
            nodeId,
            morphName,
            relationIds: [...relationIds],
            attributeIds: [...attributeIds]
        };

        // Add to primary registry
        this.morphs.set(morphId, morphData);

        // Add to node lookup
        if (!this.nodeMorphs.has(nodeId)) {
            this.nodeMorphs.set(nodeId, []);
        }
        this.nodeMorphs.get(nodeId).push(morphId);

        // Track relations
        relationIds.forEach(relationId => {
            if (!this.relationMorphs.has(relationId)) {
                this.relationMorphs.set(relationId, []);
            }
            this.relationMorphs.get(relationId).push(morphId);
        });

        // Track attributes
        attributeIds.forEach(attributeId => {
            if (!this.attributeMorphs.has(attributeId)) {
                this.attributeMorphs.set(attributeId, []);
            }
            this.attributeMorphs.get(attributeId).push(morphId);
        });

        console.log(`[MorphRegistry] Added morph ${morphName} (${morphId}) to node ${nodeId}`);
    }

    /**
     * Remove a morph from the registry
     * @param {string} morphId - Morph to remove
     */
    removeMorph(morphId) {
        const morphData = this.morphs.get(morphId);
        if (!morphData) return;

        // Remove from node lookup
        const nodeMorphs = this.nodeMorphs.get(morphData.nodeId);
        if (nodeMorphs) {
            const index = nodeMorphs.indexOf(morphId);
            if (index > -1) {
                nodeMorphs.splice(index, 1);
            }
        }

        // Remove from relation tracking
        morphData.relationIds.forEach(relationId => {
            const relationMorphs = this.relationMorphs.get(relationId);
            if (relationMorphs) {
                const index = relationMorphs.indexOf(morphId);
                if (index > -1) {
                    relationMorphs.splice(index, 1);
                }
            }
        });

        // Remove from attribute tracking
        morphData.attributeIds.forEach(attributeId => {
            const attributeMorphs = this.attributeMorphs.get(attributeId);
            if (attributeMorphs) {
                const index = attributeMorphs.indexOf(morphId);
                if (index > -1) {
                    attributeMorphs.splice(index, 1);
                }
            }
        });

        // Remove from primary registry
        this.morphs.delete(morphId);

        console.log(`[MorphRegistry] Removed morph ${morphId}`);
    }

    /**
     * Update a morph's relations and attributes
     * @param {string} morphId - Morph to update
     * @param {Array} relationIds - New relation IDs
     * @param {Array} attributeIds - New attribute IDs
     */
    updateMorph(morphId, relationIds = [], attributeIds = []) {
        const morphData = this.morphs.get(morphId);
        if (!morphData) return;

        // Remove old relations
        morphData.relationIds.forEach(relationId => {
            const relationMorphs = this.relationMorphs.get(relationId);
            if (relationMorphs) {
                const index = relationMorphs.indexOf(morphId);
                if (index > -1) {
                    relationMorphs.splice(index, 1);
                }
            }
        });

        // Remove old attributes
        morphData.attributeIds.forEach(attributeId => {
            const attributeMorphs = this.attributeMorphs.get(attributeId);
            if (attributeMorphs) {
                const index = attributeMorphs.indexOf(morphId);
                if (index > -1) {
                    attributeMorphs.splice(index, 1);
                }
            }
        });

        // Update morph data
        morphData.relationIds = [...relationIds];
        morphData.attributeIds = [...attributeIds];

        // Add new relations
        relationIds.forEach(relationId => {
            if (!this.relationMorphs.has(relationId)) {
                this.relationMorphs.set(relationId, []);
            }
            this.relationMorphs.get(relationId).push(morphId);
        });

        // Add new attributes
        attributeIds.forEach(attributeId => {
            if (!this.attributeMorphs.has(attributeId)) {
                this.attributeMorphs.set(attributeId, []);
            }
            this.attributeMorphs.get(attributeId).push(morphId);
        });

        console.log(`[MorphRegistry] Updated morph ${morphId} with ${relationIds.length} relations and ${attributeIds.length} attributes`);
    }

    /**
     * Get morph data by ID
     * @param {string} morphId - Morph ID
     * @returns {Object|null} Morph data or null if not found
     */
    getMorph(morphId) {
        return this.morphs.get(morphId) || null;
    }

    /**
     * Get all morphs for a node
     * @param {string} nodeId - Node ID
     * @returns {Array} Array of morph data objects
     */
    getNodeMorphs(nodeId) {
        const morphIds = this.nodeMorphs.get(nodeId) || [];
        return morphIds.map(morphId => this.morphs.get(morphId)).filter(Boolean);
    }

    /**
     * Get all relations for a morph
     * @param {string} morphId - Morph ID
     * @returns {Array} Array of relation IDs
     */
    getMorphRelations(morphId) {
        const morphData = this.morphs.get(morphId);
        return morphData ? morphData.relationIds : [];
    }

    /**
     * Get all attributes for a morph
     * @param {string} morphId - Morph ID
     * @returns {Array} Array of attribute IDs
     */
    getMorphAttributes(morphId) {
        const morphData = this.morphs.get(morphId);
        return morphData ? morphData.attributeIds : [];
    }

    /**
     * Get all morphs that use a specific relation
     * @param {string} relationId - Relation ID
     * @returns {Array} Array of morph IDs
     */
    getRelationMorphs(relationId) {
        return this.relationMorphs.get(relationId) || [];
    }

    /**
     * Get all morphs that use a specific attribute
     * @param {string} attributeId - Attribute ID
     * @returns {Array} Array of morph IDs
     */
    getAttributeMorphs(attributeId) {
        return this.attributeMorphs.get(attributeId) || [];
    }

    /**
     * Filter relations to only include those in the active morphs
     * @param {Array} relations - All relations
     * @param {Array|string} activeMorphIds - Active morph ID(s)
     * @returns {Array} Filtered relations
     */
    filterRelationsForMorph(relations, activeMorphIds) {
        const morphIds = Array.isArray(activeMorphIds) ? activeMorphIds : [activeMorphIds];
        const allMorphRelations = new Set();
        
        morphIds.forEach(morphId => {
            const morphRelations = this.getMorphRelations(morphId);
            morphRelations.forEach(relId => allMorphRelations.add(relId));
        });
        
        // Filter relations and deduplicate by ID
        const filtered = relations.filter(rel => allMorphRelations.has(rel.id));
        const seen = new Set();
        const deduplicated = filtered.filter(rel => {
            if (seen.has(rel.id)) {
                return false;
            }
            seen.add(rel.id);
            return true;
        });
        
        return deduplicated;
    }

    /**
     * Filter attributes to only include those in the active morphs
     * @param {Array} attributes - All attributes
     * @param {Array|string} activeMorphIds - Active morph ID(s)
     * @returns {Array} Filtered attributes
     */
    filterAttributesForMorph(attributes, activeMorphIds) {
        const morphIds = Array.isArray(activeMorphIds) ? activeMorphIds : [activeMorphIds];
        const allMorphAttributes = new Set();
        
        morphIds.forEach(morphId => {
            const morphAttributes = this.getMorphAttributes(morphId);
            morphAttributes.forEach(attrId => allMorphAttributes.add(attrId));
        });
        
        // Filter attributes and deduplicate by ID
        const filtered = attributes.filter(attr => allMorphAttributes.has(attr.id));
        const seen = new Set();
        const deduplicated = filtered.filter(attr => {
            if (seen.has(attr.id)) {
                return false;
            }
            seen.add(attr.id);
            return true;
        });
        
        return deduplicated;
    }

    /**
     * Get all morphs in the registry
     * @returns {Array} Array of all morph data objects
     */
    getAllMorphs() {
        return Array.from(this.morphs.values());
    }

    /**
     * Clear the entire registry
     */
    clear() {
        this.morphs.clear();
        this.nodeMorphs.clear();
        this.relationMorphs.clear();
        this.attributeMorphs.clear();
        console.log('[MorphRegistry] Cleared all morph data');
    }

    /**
     * Get registry statistics
     * @returns {Object} Registry statistics
     */
    getStats() {
        return {
            totalMorphs: this.morphs.size,
            totalNodes: this.nodeMorphs.size,
            totalRelations: this.relationMorphs.size,
            totalAttributes: this.attributeMorphs.size
        };
    }

    /**
     * Export registry data for persistence
     * @returns {Object} Serializable registry data
     */
    export() {
        return {
            morphs: Object.fromEntries(this.morphs),
            nodeMorphs: Object.fromEntries(this.nodeMorphs),
            relationMorphs: Object.fromEntries(this.relationMorphs),
            attributeMorphs: Object.fromEntries(this.attributeMorphs)
        };
    }

    /**
     * Import registry data from persistence
     * @param {Object} data - Serializable registry data
     */
    import(data) {
        this.clear();
        
        if (data.morphs) {
            this.morphs = new Map(Object.entries(data.morphs));
        }
        if (data.nodeMorphs) {
            this.nodeMorphs = new Map(Object.entries(data.nodeMorphs));
        }
        if (data.relationMorphs) {
            this.relationMorphs = new Map(Object.entries(data.relationMorphs));
        }
        if (data.attributeMorphs) {
            this.attributeMorphs = new Map(Object.entries(data.attributeMorphs));
        }

        console.log(`[MorphRegistry] Imported ${this.morphs.size} morphs`);
    }
}
