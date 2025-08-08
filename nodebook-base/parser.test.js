const { parseCnl } = require('./cnl-parser');
const assert = require('assert');

async function runTest() {
    console.log('Running Definitive CNL Parser Test...');

    const cnl = `
# Hydrogen [Element]
has number of protons: 1;

## Hydrogen ion
has charge: 1;
<part of> Water;

# Water [Molecule]
has formula: H2O;
    `;

    const { operations } = await parseCnl(cnl);

    // --- Expected Operations ---
    const expected = [
        // Pass 1: Node and Morph Creation
        { type: 'addNode', payload: { base_name: 'Hydrogen', options: { id: 'hydrogen', role: 'Element', parent_types: [], adjective: null } } },
        { type: 'addMorph', payload: { nodeId: 'hydrogen', morphName: 'Hydrogen ion' } },
        { type: 'addNode', payload: { base_name: 'Water', options: { id: 'water', role: 'Molecule', parent_types: [], adjective: null } } },
        
        // Pass 2: Attributes and Relations
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of protons', value: '1', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'charge', value: '1', options: { morph: 'Hydrogen ion' } } },
        { type: 'addRelation', payload: { source: 'hydrogen', target: 'water', name: 'part of', options: { morph: 'Hydrogen ion' } } },
        { type: 'addAttribute', payload: { source: 'water', name: 'formula', value: 'H2O', options: { morph: 'basic' } } }
    ];

    // --- Assertion ---
    assert.strictEqual(operations.length, expected.length, `Expected ${expected.length} operations, but got ${operations.length}`);
    
    for (let i = 0; i < expected.length; i++) {
        assert.deepStrictEqual(operations[i], expected[i], `Operation ${i} does not match expected output.\nExpected: ${JSON.stringify(expected[i])}\nActual:   ${JSON.stringify(operations[i])}`);
    }

    console.log('--- TEST PASSED ---');
}

runTest().catch(err => {
    console.error("\n--- TEST FAILED ---");
    console.error(err.message);
    process.exit(1);
});