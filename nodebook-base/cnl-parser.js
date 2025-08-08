const schemaManager = require('./schema-manager');

const HEADING_REGEX = /^\s*(#+)\s*(?:\*\*(.+?)\*\*\s*)?(.+?)(?:\s*\[(.+?)\])?$/;
const RELATION_REGEX = /^\s*<(.+?)>\s*(.*)/;
const ATTRIBUTE_REGEX = /^\s*has\s+([^:]+):\s*(.*)/;
const DESCRIPTION_REGEX = /```description\n([\s\S]*?)\n```/;

async function parseCnl(cnlText) {
    const operations = [];
    const errors = [];
    const lines = cnlText.split('\n');

    let currentNodeId = null;
    let currentNodeType = null;
    let currentMorphName = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const headingMatch = line.match(HEADING_REGEX);

        if (headingMatch) {
            const level = headingMatch[1].length;
            const [, , adjective, name, rolesString] = headingMatch;
            const roles = rolesString ? rolesString.split(';').map(r => r.trim()).filter(Boolean) : ['individual'];
            const nodeType = roles[0] || 'individual';
            const cleanName = name.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
            const cleanAdjective = adjective ? adjective.trim().toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_') : null;
            const id = cleanAdjective ? `${cleanAdjective}_${cleanName}` : cleanName;

            if (level === 1) {
                currentNodeId = id;
                currentNodeType = nodeType;
                currentMorphName = null;
                operations.push({ type: 'addNode', payload: { base_name: name.trim(), options: { id, role: nodeType, parent_types: roles.slice(1), adjective } } });
            } else if (level === 2) {
                currentMorphName = name.trim();
                operations.push({ type: 'addMorph', payload: { nodeId: currentNodeId, morphName: currentMorphName } });
            }
        } else {
            const attributeMatch = line.match(ATTRIBUTE_REGEX);
            if (attributeMatch) {
                let [, name, value] = attributeMatch;
                while (!value.trim().endsWith(';')) {
                    i++;
                    value += `\n${lines[i]}`;
                }
                value = value.slice(0, -1).trim();
                operations.push({ type: 'addAttribute', payload: { source: currentNodeId, name: name.trim(), value: value, options: { morph: currentMorphName } } });
            }

            const relationMatch = line.match(RELATION_REGEX);
            if (relationMatch) {
                let [, name, content] = relationMatch;
                while (!content.trim().endsWith(';')) {
                    i++;
                    content += `\n${lines[i]}`;
                }
                content = content.slice(0, -1).trim();
                
                const targets = content.split(';').map(t => t.trim()).filter(Boolean);
                for (const target of targets) {
                    const [targetName, morphName] = target.split(':');
                    const targetId = targetName.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '_');
                    operations.push({ type: 'addNode', payload: { base_name: targetName, options: { id: targetId, role: 'individual' } } });
                    operations.push({ type: 'addRelation', payload: { source: currentNodeId, target: targetId, name: name.trim(), options: { morph: currentMorphName, targetMorph: morphName } } });
                }
            }
        }
    }

    return { operations, errors };
}

async function validateOperations(operations) {
  return [];
}

module.exports = { parseCnl, validateOperations };