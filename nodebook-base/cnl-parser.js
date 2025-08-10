const schemaManager = require('./schema-manager');

const HEADING_REGEX = /^\s*(#+)\s*(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/;
const RELATION_REGEX = /^\s*<(.+?)>\s*([\s\S]*?);/gm;
const ATTRIBUTE_REGEX = /^\s*has\s+([^:]+):\s*([\s\S]*?);/gm;
const FUNCTION_REGEX = /^\s*has\s+function\s+\"([^\"]+)\"\s*;/gm;
const DELETE_REGEX = /~~(.+?)~~/g;
const DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/;

async function parseCnl(cnlText) {
    const operations = [];
    const structuralTree = buildStructuralTree(cnlText);
    const definedNodeIds = new Set();

    // Handle deletions first
    const deleteMatches = [...cnlText.matchAll(DELETE_REGEX)];
    for (const match of deleteMatches) {
        const deletedText = match[1];
        if (deletedText.startsWith('#')) {
            const { id } = processNodeHeading(deletedText);
            operations.push({ type: 'deleteNode', payload: { id } });
        }
    }

    // Process additions and updates
    for (const nodeBlock of structuralTree) {
        const { id: nodeId, payload: nodePayload } = processNodeHeading(nodeBlock.heading);
        if (!definedNodeIds.has(nodeId)) {
            operations.push({ type: 'addNode', payload: nodePayload });
            definedNodeIds.add(nodeId);
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

    for (const nodeBlock of structuralTree) {
        const { id: nodeId, type: nodeType } = processNodeHeading(nodeBlock.heading);
        const mainNeighborhoodOps = await processNeighborhood(nodeId, nodeType, nodeBlock.content, 'basic', definedNodeIds);
        operations.push(...mainNeighborhoodOps);

        for (const morphBlock of nodeBlock.morphs) {
            const morphName = morphBlock.heading.match(HEADING_REGEX)[3].trim();
            const morphNeighborhoodOps = await processNeighborhood(nodeId, nodeType, morphBlock.content, morphName, definedNodeIds);
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
        if (!line.trim() && !currentSubBlock) continue;

        const headingMatch = line.match(HEADING_REGEX);
        if (headingMatch) {
            const level = headingMatch[1].length;
            if (level === 1) {
                currentNodeBlock = { heading: line.trim(), content: [], morphs: [] };
                currentSubBlock = currentNodeBlock;
                tree.push(currentNodeBlock);
            } else if (level === 2 && currentNodeBlock) {
                const currentMorphBlock = { heading: line.trim(), content: [] };
                currentNodeBlock.morphs.push(currentMorphBlock);
                currentSubBlock = currentMorphBlock;
            }
        } else if (currentSubBlock) {
            currentSubBlock.content.push(line);
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

async function processNeighborhood(nodeId, nodeType, lines, morphName, definedNodeIds) {
    const neighborhoodOps = [];
    let content = lines.join('\n');
    
    const descriptionMatch = content.match(DESCRIPTION_REGEX);
    if (descriptionMatch) {
        const description = descriptionMatch[1].trim();
        neighborhoodOps.push({ type: 'updateNode', payload: { id: nodeId, fields: { description } } });
        content = content.replace(DESCRIPTION_REGEX, '').trim();
    }

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