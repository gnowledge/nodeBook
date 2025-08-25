const crypto = require('crypto');
const schemaManager = require('./schema-manager');

const HEADING_REGEX = /^\s*(#+)\s*(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/;
const RELATION_REGEX = /^\s*<(.+?)>\s*([\s\S]*?);/gm;
const ATTRIBUTE_REGEX = /^\s*has\s+([^:]+):\s*([\s\S]*?);/gm;
const FUNCTION_REGEX = /^\s*has\s+function\s+\"([^\"]+)\"\s*;/gm;
const DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/;
const GRAPH_DESCRIPTION_REGEX = /```graph-description\n([\s\S]*?)\n```/;

// MindMap specific regex patterns
const MINDMAP_MODE_REGEX = /<! MindMap Mode:\s*([^>]+)>/;
const MINDMAP_HEADING_REGEX = /^\s*(#+)\s*(.+?)$/;
const MINDMAP_DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/;

function getOperationsFromCnl(cnlText, mode = 'richgraph') {
    if (!cnlText) {
        return [];
    }
    
    if (mode === 'mindmap') {
        return getMindMapOperationsFromCnl(cnlText);
    }
    
    // Original rich graph parsing logic
    const operations = [];
    const structuralTree = buildStructuralTree(cnlText);

    const graphDescriptionMatch = cnlText.match(GRAPH_DESCRIPTION_REGEX);
    if (graphDescriptionMatch) {
        const description = graphDescriptionMatch[1].trim();
        operations.push({ type: 'updateGraphDescription', payload: { description }, id: 'graph_description' });
    }

    for (const nodeBlock of structuralTree) {
        const { id: nodeId, payload: nodePayload } = processNodeHeading(nodeBlock.heading);
        operations.push({ type: 'addNode', payload: nodePayload, id: nodeId });

        const neighborhoodOps = processNeighborhood(nodeId, nodeBlock.content);
        operations.push(...neighborhoodOps);
    }
    return operations;
}

function getMindMapOperationsFromCnl(cnlText) {
    const operations = [];
    
    // Extract MindMap mode and relation type
    const modeMatch = cnlText.match(MINDMAP_MODE_REGEX);
    if (!modeMatch) {
        throw new Error('MindMap mode requires <! MindMap Mode: relation_type> declaration');
    }
    
    const relationType = modeMatch[1].trim();
    console.log(`[MindMap] Parsing with relation type: ${relationType}`);
    
    // Extract graph description if present
    const graphDescriptionMatch = cnlText.match(GRAPH_DESCRIPTION_REGEX);
    if (graphDescriptionMatch) {
        const description = graphDescriptionMatch[1].trim();
        operations.push({ type: 'updateGraphDescription', payload: { description }, id: 'graph_description' });
    }
    
    // Parse MindMap structure
    const mindMapTree = buildMindMapTree(cnlText);
    
    for (const nodeBlock of mindMapTree) {
        const { id: nodeId, payload: nodePayload } = processMindMapNodeHeading(nodeBlock.heading);
        operations.push({ type: 'addNode', payload: nodePayload, id: nodeId });
        
        // Add description if present
        if (nodeBlock.description) {
            operations.push({ 
                type: 'updateNode', 
                payload: { id: nodeId, fields: { description: nodeBlock.description } }, 
                id: `${nodeId}_description` 
            });
        }
        
        // Add parent-child relations based on heading levels
        if (nodeBlock.parentId) {
            operations.push({
                type: 'addRelation',
                payload: { 
                    source: nodeBlock.parentId, 
                    target: nodeId, 
                    name: relationType 
                },
                id: `rel_${nodeBlock.parentId}_${relationType}_${nodeId}`
            });
        }
    }
    
    return operations;
}

function buildMindMapTree(cnlText) {
    const tree = [];
    const lines = cnlText.split('\n');
    const nodeStack = []; // Track parent nodes by heading level
    
    for (const line of lines) {
        if (!line.trim()) continue;
        
        const headingMatch = line.match(MINDMAP_HEADING_REGEX);
        if (headingMatch) {
            const [, hashes, name] = headingMatch;
            const level = hashes.length;
            const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
            const nodeId = cleanName;
            
            // Find parent based on heading level
            let parentId = null;
            if (level > 1) {
                // Find the closest parent at level - 1
                for (let i = nodeStack.length - 1; i >= 0; i--) {
                    if (nodeStack[i].level === level - 1) {
                        parentId = nodeStack[i].id;
                        break;
                    }
                }
            }
            
            const nodeBlock = { 
                heading: line.trim(), 
                id: nodeId,
                level,
                parentId,
                description: null,
                content: []
            };
            
            tree.push(nodeBlock);
            nodeStack.push({ id: nodeId, level });
            
            // Remove deeper levels from stack when we go back to a higher level
            while (nodeStack.length > 0 && nodeStack[nodeStack.length - 1].level >= level) {
                nodeStack.pop();
            }
            nodeStack.push({ id: nodeId, level });
            
        } else if (tree.length > 0) {
            const currentNode = tree[tree.length - 1];
            currentNode.content.push(line);
            
            // Check for description
            const descMatch = line.match(MINDMAP_DESCRIPTION_REGEX);
            if (descMatch) {
                currentNode.description = descMatch[1].trim();
            }
        }
    }
    
    return tree;
}

function processMindMapNodeHeading(heading) {
    const match = heading.match(MINDMAP_HEADING_REGEX);
    const [, hashes, name] = match;
    const level = hashes.length;
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
    const id = cleanName;
    
    return { 
        id, 
        level,
        payload: { 
            base_name: name.trim(), 
            options: { 
                id, 
                role: 'individual', // MindMap nodes are always individuals
                parent_types: [],
                adjective: null,
                level // Store heading level for visualization
            } 
        } 
    };
}

function getNodeOrderFromCnl(cnlText) {
    if (!cnlText) {
        return [];
    }
    const ids = [];
    const structuralTree = buildStructuralTree(cnlText);
    for (const nodeBlock of structuralTree) {
        const { id: nodeId } = processNodeHeading(nodeBlock.heading);
        ids.push(nodeId);
    }
    return ids;
}

async function diffCnl(oldCnl, newCnl, mode = 'richgraph') {
    const oldOps = getOperationsFromCnl(oldCnl, mode);
    const newOps = getOperationsFromCnl(newCnl, mode);

    const oldOpsMap = new Map(oldOps.map(op => [op.id, op]));
    const newOpsMap = new Map(newOps.map(op => [op.id, op]));

    const operations = [];

    for (const [id, op] of oldOpsMap.entries()) {
        if (!newOpsMap.has(id)) {
            const deleteType = `delete${op.type.slice(3)}`;
            operations.push({ type: deleteType, payload: { id } });
        }
    }

    for (const [id, op] of newOpsMap.entries()) {
        if (!oldOpsMap.has(id)) {
            operations.push(op);
        } else {
            if (op.type === 'updateNode' || op.type === 'updateGraphDescription') {
                operations.push(op);
            }
        }
    }

    return { operations, errors: [] };
}

async function validateOperations(operations) {
    const errors = [];
    const nodeTypes = await schemaManager.getNodeTypes();
    const relationTypes = await schemaManager.getRelationTypes();
    const attributeTypes = await schemaManager.getAttributeTypes();

    for (const op of operations) {
        if (op.type === 'addNode') {
            const { role } = op.payload.options;
            if (role !== 'individual' && !nodeTypes.find(nt => nt.name === role)) {
                errors.push({ message: `Node type "${role}" is not defined in the schema.` });
            }
        } else if (op.type === 'addAttribute') {
            const { name } = op.payload;
            if (!attributeTypes.find(at => at.name === name)) {
                errors.push({ message: `Attribute type "${name}" is not defined in the schema.` });
            }
        } else if (op.type === 'addRelation') {
            const { name } = op.payload;
            if (!relationTypes.find(rt => rt.name === name)) {
                errors.push({ message: `Relation type "${name}" is not defined in the schema.` });
            }
        }
    }
    return errors;
}

function buildStructuralTree(cnlText) {
    const tree = [];
    let currentNodeBlock = null;
    const lines = cnlText.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;
        const headingMatch = line.match(HEADING_REGEX);
        if (headingMatch) {
            currentNodeBlock = { heading: line.trim(), content: [] };
            tree.push(currentNodeBlock);
        } else if (currentNodeBlock) {
            currentNodeBlock.content.push(line);
        }
    }
    return tree;
}

function processNodeHeading(heading) {
    const match = heading.match(HEADING_REGEX);
    const [, , adjective, name, rolesString] = match;
    const roles = rolesString ? rolesString.split(';').map(r => r.trim()).filter(Boolean) : ['individual'];
    const nodeType = roles[0] || 'individual';
    const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
    const cleanAdjective = adjective ? adjective.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_') : null;
    const id = cleanAdjective ? `${cleanAdjective}_${cleanName}` : cleanName;
    return { id, type: nodeType, payload: { base_name: name.trim(), options: { id, role: nodeType, parent_types: roles.slice(1), adjective: adjective ? adjective.trim() : null } } };
}

function processNeighborhood(nodeId, lines) {
    const neighborhoodOps = [];
    let content = lines.join('\n');
    
    const descriptionMatch = content.match(DESCRIPTION_REGEX);
    if (descriptionMatch) {
        const description = descriptionMatch[1].trim();
        const id = `attr_${nodeId}_description_${crypto.createHash('sha1').update(description).digest('hex').slice(0, 6)}`;
        neighborhoodOps.push({ type: 'updateNode', payload: { id: nodeId, fields: { description } }, id: `${nodeId}_description` });
        content = content.replace(DESCRIPTION_REGEX, '').trim();
    }

    const attributeMatches = [...content.matchAll(ATTRIBUTE_REGEX)];
    for (const match of attributeMatches) {
        const [, name, value] = match;
        const valueHash = crypto.createHash('sha1').update(String(value.trim())).digest('hex').slice(0, 6);
        const id = `attr_${nodeId}_${name.trim().toLowerCase().replace(/\s+/g, '_')}_${valueHash}`;
        neighborhoodOps.push({ type: 'addAttribute', payload: { source: nodeId, name: name.trim(), value: value.trim() }, id });
    }

    const functionMatches = [...content.matchAll(FUNCTION_REGEX)];
    for (const match of functionMatches) {
        const [, name] = match;
        const id = `func_${nodeId}_${name.trim().toLowerCase().replace(/\s+/g, '_')}`;
        neighborhoodOps.push({ type: 'applyFunction', payload: { source: nodeId, name: name.trim() }, id });
    }

    const relationMatches = [...content.matchAll(RELATION_REGEX)];
    for (const match of relationMatches) {
        const [, relationName, targets] = match;
        for (const target of targets.split(';').map(t => t.trim()).filter(Boolean)) {
            const targetId = target.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
            const id = `rel_${nodeId}_${relationName.trim().toLowerCase().replace(/\s+/g, '_')}_${targetId}`;
            neighborhoodOps.push({ type: 'addRelation', payload: { source: nodeId, target: targetId, name: relationName.trim() }, id });
        }
    }
    
    return neighborhoodOps;
}



module.exports = { diffCnl, validateOperations, getNodeOrderFromCnl };
