const schemaManager = require('./schema-manager');

// --- Regex Definitions ---
const HEADING_REGEX = /^\s*#+\s*(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/;
const RELATION_REGEX = /^\s*(?:\+\+(.+?)\+\+\s*)?<(.+?)>\s*(?:\s*\[(.+?)\]\s*)?(.+)$/; // Simplified regex
const ATTRIBUTE_REGEX = /^\s*has\s+([^:]+):\s*(?:\+\+(.+?)\+\+\s*)?(.+?)(?:\s*\*(.+)\*)?(?:\s*\[(.+?)\])?$/; // Supports ++adverb++, *unit*, and [modality]

function parseTargetString(targetString) {
    const match = targetString.match(/^(?:\*\*(.+?)\*\*\s*)?(?:\*(.+?)\*\s*)?(.+)$/);
    if (!match) return null;
    const [, adjective, quantifier, baseName] = match;
    return {
        adjective: adjective ? adjective.trim() : null,
        quantifier: quantifier ? quantifier.trim() : null,
        baseName: baseName.trim(),
    };
}

async function parseCnl(cnlText) {
    const operations = [];
    const errors = [];

    const nodeBlocks = cnlText.split(/(^\s*#+\s*.+)/m).filter(s => s.trim() !== '');

    for (let i = 0; i < nodeBlocks.length; i += 2) {
        const heading = nodeBlocks[i];
        let content = nodeBlocks[i + 1] || '';
        
        const nodeNameMatch = heading.match(HEADING_REGEX);
        if (!nodeNameMatch) continue;

        const [, adjective, nodeName, rolesString] = nodeNameMatch;
        const nodeId = nodeName.trim().toLowerCase().replace(/\s+/g, '_');
        const roles = rolesString ? rolesString.split(';').map(r => r.trim()).filter(Boolean) : ['individual'];
        
        operations.push({ type: 'addNode', payload: { 
            base_name: nodeName.trim(), 
            options: { id: nodeId, role: roles[0] || 'individual', parent_types: roles.slice(1), adjective: adjective ? adjective.trim() : null } 
        }});

        const descriptionRegex = /```description\n([\s\S]*?)\n```/;
        const descriptionMatch = content.match(descriptionRegex);
        if (descriptionMatch) {
            operations.push({ type: 'updateNode', payload: { id: nodeId, fields: { description: descriptionMatch[1] } } });
            content = content.replace(descriptionRegex, '');
        }

        const neighborhoodOps = await processNeighborhood(nodeId, content.split('\n'));
        operations.push(...neighborhoodOps);
    }
    
    return { operations, errors };
}

function parseTargetString(targetString) {
    const match = targetString.match(/^(?:\*\*(.+?)\*\*\s*)?(?:\*(.+?)\*\s*)?(.+)$/);
    if (!match) return null;
    const [, adjective, quantifier, baseName] = match;
    return {
        adjective: adjective ? adjective.trim() : null,
        quantifier: quantifier ? quantifier.trim() : null,
        baseName: baseName.trim(),
    };
}

async function processNeighborhood(nodeId, lines) {
         const operations = [];
         const relationTypes = await schemaManager.getRelationTypes();
     
         for (const line of lines) {
             if (line.trim() === '') continue;
     
             const attributeMatch = line.match(ATTRIBUTE_REGEX);
             if (attributeMatch) {
                const [, attributeName, adverb, value, unit, modality] = attributeMatch;
                const options = {
                    adverb: adverb ? adverb.trim() : null,
                    unit: unit ? unit.trim() : null,
                    modality: modality ? modality.trim() : null,
                };
                operations.push({ type: 'addAttribute', payload: { source: nodeId, name: attributeName.trim(), value: value.trim(), options } });
                continue;
            }
    
            const relationMatch = line.match(RELATION_REGEX);
            if (relationMatch) {
                const [, adverb, relationName, modality, targetsString] = relationMatch;
                const targets = targetsString.split(';').map(t => t.trim()).filter(Boolean);
    
                for (const targetFullName of targets) {
                    const targetParts = parseTargetString(targetFullName);
                    if (!targetParts) continue;
    
                    const { adjective, quantifier, baseName } = targetParts;
    
                    const cleanBaseName = baseName.toLowerCase().replace(/\s+/g, '_');
                    const cleanAdjective = adjective ? adjective.toLowerCase().replace(/\s+/g, '_') : null;
                    const targetId = cleanAdjective ? `${cleanAdjective}_${cleanBaseName}` : cleanBaseName;
    
                    const relationSchema = relationTypes.find(rt => rt.name === relationName.trim() || (rt.aliases && rt.aliases.includes(relationName.trim())));
                    const canonicalRelationName = relationSchema ? relationSchema.name : relationName.trim();
                    let targetRole = (relationSchema?.range && relationSchema.range.length > 0) ? relationSchema.range[0] : 'individual';
    
                    if (canonicalRelationName === 'is_a') {
                      targetRole = 'class';
                    }
    
                    if (relationSchema?.domain && relationSchema.domain.length > 0) {
                        operations.push({ type: 'updateNode', payload: { id: nodeId, fields: { role: relationSchema.domain[0] } } });
                    }
    
                    operations.push({ type: 'addNode', payload: {
                        base_name: baseName,
                        options: {
                            id: targetId,
                            role: targetRole,
                            adjective: adjective,
                            quantifier: quantifier
                        }
                    }});
                    operations.push({ type: 'addRelation', payload: {
                        source: nodeId,
                        target: targetId,
                        name: canonicalRelationName,
                        options: { adverb: adverb ? adverb.trim() : null, modality: modality ? modality.trim() : null }
                   }});
                }
            }
        }
        return operations;
}


async function validateOperations(operations) {
  const errors = [];
  const nodeTypes = await schemaManager.getNodeTypes();
  const relationTypes = await schemaManager.getRelationTypes();
  const attributeTypes = await schemaManager.getAttributeTypes();
  const definedNodeTypeNames = new Set(nodeTypes.map(nt => nt.name.toLowerCase()));

  const nodeTypeMap = new Map();
  operations.forEach(op => {
    if (op.type === 'addNode') {
      const role = op.payload.options.role ? op.payload.options.role.toLowerCase() : 'individual';
      nodeTypeMap.set(op.payload.options.id, { role, isExplicit: !!op.payload.options.role });
    }
  });
  operations.forEach(op => {
    if (op.type === 'updateNode' && op.payload.fields.role) {
      const existing = nodeTypeMap.get(op.payload.id) || {};
      const role = op.payload.fields.role.toLowerCase();
      nodeTypeMap.set(op.payload.id, { ...existing, role, isExplicit: true });
    }
  });

  for (const [nodeId, { role, isExplicit }] of nodeTypeMap.entries()) {
    if (!isExplicit && role === 'individual') {
      errors.push({ message: `Node "${nodeId}" must be assigned an explicit NodeType in Strict Mode (e.g., '# ${nodeId} [Person]').` });
    }
    if (!definedNodeTypeNames.has(role)) {
      errors.push({ message: `NodeType "${role}" for node "${nodeId}" is not defined in the schema.` });
    }
  }

  for (const op of operations) {
    if (op.type === 'addRelation') {
      const relationSchema = relationTypes.find(rt => rt.name === op.payload.name || (rt.aliases && rt.aliases.includes(op.payload.name)));
      if (!relationSchema) {
        errors.push({ message: `Relation type "${op.payload.name}" is not defined in the schema.` });
        continue;
      }
      const sourceNodeType = nodeTypeMap.get(op.payload.source)?.role;
      const targetNodeType = nodeTypeMap.get(op.payload.target)?.role;

      if (relationSchema.domain && relationSchema.domain.length > 0 && !relationSchema.domain.map(d => d.toLowerCase()).includes(sourceNodeType)) {
        errors.push({ message: `Relation "${op.payload.name}" cannot have a source of type "${sourceNodeType}" (expected: ${relationSchema.domain.join(', ')}).` });
      }
      if (relationSchema.range && relationSchema.range.length > 0 && !relationSchema.range.map(r => r.toLowerCase()).includes(targetNodeType)) {
        errors.push({ message: `Relation "${op.payload.name}" cannot have a target of type "${targetNodeType}" (expected: ${relationSchema.range.join(', ')}).` });
      }

    } else if (op.type === 'addAttribute') {
      const attributeSchema = attributeTypes.find(at => at.name === op.payload.name || (at.aliases && at.aliases.includes(op.payload.name)));
      if (!attributeSchema) {
        errors.push({ message: `Attribute type "${op.payload.name}" is not defined in the schema.` });
        continue;
      }
      const sourceNodeType = nodeTypeMap.get(op.payload.source)?.role;

      if (attributeSchema.scope && attributeSchema.scope.length > 0 && !attributeSchema.scope.map(s => s.toLowerCase()).includes(sourceNodeType)) {
        errors.push({ message: `Attribute "${op.payload.name}" cannot be applied to a node of type "${sourceNodeType}" (expected scope: ${attributeSchema.scope.join(', ')}).` });
      }
    }
  }
  return errors;
}

module.exports = { parseCnl, validateOperations };
