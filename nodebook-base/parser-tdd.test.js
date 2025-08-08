const { buildStructuralTree, generateNodeAndMorphOps, generateNeighborhoodOps } = require('./cnl-parser');
const assert = require('assert');

function testBuildStructuralTree() {
    console.log('Running Test: buildStructuralTree...');

    const cnl = `
# Hydrogen [Element]
has number of protons: 1;

## Hydrogen ion
has charge: 1;
<part of> Water;

# Water [Molecule]
    `;

    const expected = [
        {
            heading: '# Hydrogen [Element]',
            description: null,
            content: ['has number of protons: 1;'],
            morphs: [
                {
                    heading: '## Hydrogen ion',
                    description: null,
                    content: ['has charge: 1;', '<part of> Water;']
                }
            ]
        },
        {
            heading: '# Water [Molecule]',
            description: null,
            content: [],
            morphs: []
        }
    ];

    const actual = buildStructuralTree(cnl);

    assert.deepStrictEqual(actual, expected, 'The structural tree was not built correctly.');

    console.log('--- TEST PASSED: buildStructuralTree ---');
    return actual; // Return the tree for the next test
}

function testGenerateNodeAndMorphOps(structuralTree) {
    console.log('Running Test: generateNodeAndMorphOps...');

    const expected = [
        { type: 'addNode', payload: { base_name: 'Hydrogen', options: { id: 'hydrogen', role: 'Element', parent_types: [], adjective: null } } },
        { type: 'addMorph', payload: { nodeId: 'hydrogen', morphName: 'Hydrogen ion' } },
        { type: 'addNode', payload: { base_name: 'Water', options: { id: 'water', role: 'Molecule', parent_types: [], adjective: null } } }
    ];

    const { operations } = generateNodeAndMorphOps(structuralTree);
    
    assert.deepStrictEqual(operations, expected, 'Node and morph operations were not generated correctly.');

    console.log('--- TEST PASSED: generateNodeAndMorphOps ---');
}

async function testGenerateNeighborhoodOps(structuralTree) {
    console.log('Running Test: generateNeighborhoodOps...');

    const expected = [
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of protons', value: '1', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'charge', value: '1', options: { morph: 'Hydrogen ion' } } },
        { type: 'addNode', payload: { base_name: 'Water', options: { id: 'water', role: 'individual' } } },
        { type: 'addRelation', payload: { source: 'hydrogen', target: 'water', name: 'part of', options: { morph: 'Hydrogen ion' } } }
    ];

    const { operations } = await generateNeighborhoodOps(structuralTree);

    assert.deepStrictEqual(operations, expected, 'Neighborhood operations were not generated correctly.');

    console.log('--- TEST PASSED: generateNeighborhoodOps ---');
}

async function run() {
    const tree = testBuildStructuralTree();
    testGenerateNodeAndMorphOps(tree);
    await testGenerateNeighborhoodOps(tree);
}

run();
