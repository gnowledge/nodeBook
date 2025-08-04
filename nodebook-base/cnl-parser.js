const HEADING_REGEX = /^\s*#+\s*(.+)/;

function parseCnl(cnlText) {
    const operations = [];
    const errors = [];

    // Split the text into blocks based on node headings
    const nodeBlocks = cnlText.split(/(^\s*#+\s*.+)/m).filter(s => s.trim() !== '');

    for (let i = 0; i < nodeBlocks.length; i += 2) {
        const heading = nodeBlocks[i];
        let content = nodeBlocks[i + 1] || '';
        
        const nodeNameMatch = heading.match(HEADING_REGEX);
        if (!nodeNameMatch) continue;

        const nodeName = nodeNameMatch[1].trim();
        const nodeId = nodeName.toLowerCase().replace(/\s+/g, '_');
        operations.push({ type: 'addNode', payload: { base_name: nodeName, options: { id: nodeId, role: 'individual' } } });

        // 1. Extract description block first
        const descriptionRegex = /```description\n([\s\S]*?)\n```/;
        const descriptionMatch = content.match(descriptionRegex);
        if (descriptionMatch) {
            const description = descriptionMatch[1];
            operations.push({ type: 'updateNode', payload: { id: nodeId, fields: { description } } });
            content = content.replace(descriptionRegex, ''); // Remove from content
        }

        // 2. Process the remaining lines for relations and attributes
        const lines = content.split('\n');
        const neighborhoodOps = processNeighborhood(nodeId, lines);
        operations.push(...neighborhoodOps);
    }
    
    return { operations, errors }; // Simplified validation for now
}

function processNeighborhood(nodeId, lines) {
    const operations = [];
    const ATTRIBUTE_REGEX = /^\s*has\s+([^:]+):\s*(.+?)(?:\s*\*(.+)\*)?$/;
    const RELATION_REGEX_ANGLE = /^\s*<(.+?)>\s*(.+)$/;
    const RELATION_REGEX_COLON = /^\s*([^:]+):\s*(.+)$/;

    lines.forEach(line => {
        if (line.trim() === '') return;

        const attributeMatch = line.match(ATTRIBUTE_REGEX);
        if (attributeMatch) {
            const [, attributeName, value, unit] = attributeMatch;
            const options = unit ? { unit: unit.trim() } : {};
            operations.push({ type: 'addAttribute', payload: { source: nodeId, name: attributeName.trim(), value: value.trim(), options } });
            return;
        }

        const relationMatch = line.match(RELATION_REGEX_ANGLE) || line.match(RELATION_REGEX_COLON);
        if (relationMatch) {
            if (line.match(ATTRIBUTE_REGEX)) return;
            const [, relationName, targetName] = relationMatch;
            const targetId = targetName.trim().toLowerCase().replace(/\s+/g, '_');
            operations.push({ type: 'addNode', payload: { base_name: targetName.trim(), options: { id: targetId, role: 'individual' } } });
            operations.push({ type: 'addRelation', payload: { source: nodeId, target: targetId, name: relationName.trim(), options: {} } });
        }
    });
    return operations;
}



/**
 * Executes a list of parsed graph operations.
 * @param {HyperGraph} graph
 * @param {Array} operations
 */
async function executeOperations(graph, operations) {
    for (const op of operations) {
        switch (op.type) {
            case 'addNode':
                const { base_name, options } = op.payload;
                const existingNode = await graph.getNode(options.id);
                if (!existingNode) {
                    await graph.addNode(base_name, options);
                }
                break;
            case 'updateNode':
                await graph.updateNode(op.payload.id, op.payload.fields);
                break;
            case 'addRelation':
                await graph.addRelation(op.payload.source, op.payload.target, op.payload.name, op.payload.options);
                break;
            case 'addAttribute':
                await graph.addAttribute(op.payload.source, op.payload.name, op.payload.value, op.payload.options);
                break;
        }
    }
}

module.exports = { parseCnl, executeOperations };