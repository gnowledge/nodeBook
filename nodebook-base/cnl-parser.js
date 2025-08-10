const schemaManager = require('./schema-manager');

const HEADING_REGEX = /^\s*(#+)\s*(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/;
const RELATION_REGEX = /^\s*<(.+?)>\s*([\s\S]*?);/gm;
const ATTRIBUTE_REGEX = /^\s*has\s+([^:]+):\s*([\s\S]*?);/gm;
const FUNCTION_REGEX = /^\s*has\s+function\s+\"([^\"]+)\"\s*;/gm;
const DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/;

async function parseCnl(cnlText) {
    const operations = [];
    const structuralTree = buildStructuralTree(cnlText);
    const definedNodeIds = new Set();

    // Pass 1: Create all nodes and morphs
    for (const nodeBlock of structuralTree) {
        const { id: nodeId, payload: nodePayload } = processNodeHeading(nodeBlock.heading);
        if (!definedNodeIds.has(nodeId)) {
            operations.push({ type: 'addNode', payload: nodePayload });
            definedNodeIds.add(nodeId);
        }

        if (nodeBlock.description) {
            operations.push({ type: 'updateNode', payload: { id: nodeId, fields: { description: nodeBlock.description } } });
        }

        for (const morphBlock of nodeBlock.morphs) {
            const morphName = morphBlock.heading.match(HEADING_REGEX)[3].trim();
            const morphPayload = {
                morph_id: `${nodeId}_morph_${Date.now()}`,
                node_id: nodeId,
                name: morphName,
                relationNode_ids: [],
                attributeNode_ids: []
            };
            operations.push({ type: 'addMorph', payload: { nodeId, morph: morphPayload } });
        }
    }

    // Pass 2: Create relations and attributes
    for (const nodeBlock of structuralTree) {
        const { id: nodeId, type: nodeType } = processNodeHeading(nodeBlock.heading);
        const mainNeighborhoodOps = await processNeighborhood(nodeId, nodeType, nodeBlock.content, 'basic', definedNodeIds, operations);
        operations.push(...mainNeighborhoodOps);

        for (const morphBlock of nodeBlock.morphs) {
            const morphName = morphBlock.heading.match(HEADING_REGEX)[3].trim();
            const morphNeighborhoodOps = await processNeighborhood(nodeId, nodeType, morphBlock.content, morphName, definedNodeIds, operations);
            operations.push(...morphNeighborhoodOps);
        }
    }

    return { operations, errors: [] };
}

function buildStructuralTree(cnlText) {
    const tree = [];
    let currentNodeBlock = null;
    let currentSubBlock = null;
    const lines = cnlText.split('\n');

    for (const line of lines) {
        if (!line.trim()) continue;

        const headingMatch = line.match(HEADING_REGEX);
        if (headingMatch) {
            const level = headingMatch[1].length;
            if (level === 1) {
                currentNodeBlock = { heading: line.trim(), description: null, content: [], morphs: [] };
                currentSubBlock = currentNodeBlock;
                tree.push(currentNodeBlock);
            } else if (level === 2 && currentNodeBlock) {
                const currentMorphBlock = { heading: line.trim(), description: null, content: [] };
                currentNodeBlock.morphs.push(currentMorphBlock);
                currentSubBlock = currentMorphBlock;
            }
        } else if (currentSubBlock) {
            const fullContent = currentSubBlock.content.join('\n') + '\n' + line;
            const descriptionMatch = fullContent.match(DESCRIPTION_REGEX);
            if (descriptionMatch) {
                currentSubBlock.description = descriptionMatch[1].trim();
                currentSubBlock.content = [];
            } else {
                currentSubBlock.content.push(line.trim());
            }
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

async function processNeighborhood(nodeId, nodeType, lines, morphName, definedNodeIds, operations) {
    const neighborhoodOps = [];
    const content = lines.join('\n');
    const relationTypes = await schemaManager.getRelationTypes();

    const attributeMatches = [...content.matchAll(ATTRIBUTE_REGEX)];
    for (const match of attributeMatches) {
        const [, name, value] = match;
        neighborhoodOps.push({ type: 'addAttribute', payload: { source: nodeId, name: name.trim(), value: value.trim(), options: { morph: morphName } } });
    }

    const functionMatches = [...content.matchAll(FUNCTION_REGEX)];
    for (const match of functionMatches) {
        const [, name] = match;
        neighborhoodOps.push({ type: 'applyFunction', payload: { source: nodeId, name: name.trim(), options: { morph: morphName } } });
    }

    const relationMatches = [...content.matchAll(RELATION_REGEX)];
    for (const match of relationMatches) {
        await processRelation(neighborhoodOps, nodeId, nodeType, match, relationTypes, morphName, definedNodeIds);
    }
    
    return neighborhoodOps;
}

async function processRelation(operations, nodeId, nodeType, relationMatch, relationTypes, morphName, definedNodeIds) {
    const [, relationName, content] = relationMatch;
    const targets = content.trim().split(';').map(t => t.trim()).filter(Boolean);

    for (const targetFullName of targets) {
        const [targetName, targetMorphName] = targetFullName.split(':');
        const targetId = targetName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
        
        if (!definedNodeIds.has(targetId)) {
            operations.push({ type: 'addNode', payload: { base_name: targetName, options: { id: targetId, role: 'individual' } } });
            definedNodeIds.add(targetId);
        }
        
        operations.push({ type: 'addRelation', payload: { source: nodeId, target: targetId, name: relationName.trim(), options: { morph: morphName, targetMorph: targetMorphName } } });
    }
}

async function validateOperations(operations) {
  return [];
}

module.exports = { parseCnl, buildStructuralTree, validateOperations };
