const { parseCnl } = require('./cnl-parser');
const assert = require('assert');
const fs = require('fs').promises;
const path = require('path');

async function runTest() {
    console.log('Running Definitive CNL Parser Test...');

    const cnl = await fs.readFile(path.join(__dirname, '../transition_example.cnl'), 'utf-8');
    const { operations } = await parseCnl(cnl);

    // --- Expected Operations ---
    const expected = [
        // Pass 1: Nodes & Morphs
        { type: 'addNode', payload: { base_name: 'Hydrogen', options: { id: 'hydrogen', role: 'Element', parent_types: [], adjective: null } } },
        { type: 'addMorph', payload: { nodeId: 'hydrogen', morphName: 'Hydrogen ion' } },
        { type: 'addMorph', payload: { nodeId: 'hydrogen', morphName: 'Hydrogen isotope' } },
        { type: 'addNode', payload: { base_name: 'Oxygen', options: { id: 'oxygen', role: 'Element', parent_types: [], adjective: null } } },
        { type: 'addMorph', payload: { nodeId: 'oxygen', morphName: 'Oxide ion' } },
        { type: 'addNode', payload: { base_name: 'Water', options: { id: 'water', role: 'Class', parent_types: [], adjective: null } } },
        { type: 'addMorph', payload: { nodeId: 'water', morphName: 'hydronium' } },
        { type: 'addMorph', payload: { nodeId: 'water', morphName: 'hydroxide' } },
        { type: 'addNode', payload: { base_name: 'Combustion Trigger', options: { id: 'combustion_trigger', role: 'LogicalOperator', parent_types: [], adjective: null } } },
        { type: 'addNode', payload: { base_name: 'Electrolysis of Water', options: { id: 'electrolysis_of_water', role: 'Transition', parent_types: [], adjective: null } } },
        { type: 'addNode', payload: { base_name: 'Combustion', options: { id: 'combustion', role: 'Transition', parent_types: [], adjective: null } } },
        { type: 'addNode', payload: { base_name: 'Spark', options: { id: 'spark', role: 'Energy', parent_types: [], adjective: null } } },
        { type: 'addNode', payload: { base_name: 'Flame', options: { id: 'flame', role: 'Energy', parent_types: [], adjective: null } } },
        { type: 'addNode', payload: { base_name: 'Electricity', options: { id: 'electricity', role: 'Energy', parent_types: [], adjective: null } } },
        { type: 'addNode', payload: { base_name: 'Substance', options: { id: 'substance', role: 'individual' } } },
        { type: 'addNode', payload: { base_name: 'Molecule', options: { id: 'molecule', role: 'individual' } } },

        // Pass 2: Attributes & Relations
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of protons', value: '1', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of electrons', value: '1', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of neutrons', value: '0', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of protons', value: '1', options: { morph: 'Hydrogen ion' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of neutrons', value: '0', options: { morph: 'Hydrogen ion' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of electrons', value: '0', options: { morph: 'Hydrogen ion' } } },
        { type: 'addRelation', payload: { source: 'hydrogen', target: 'water', name: 'part of', options: { morph: 'Hydrogen ion' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of protons', value: '1', options: { morph: 'Hydrogen isotope' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of neutrons', value: '1', options: { morph: 'Hydrogen isotope' } } },
        { type: 'addAttribute', payload: { source: 'hydrogen', name: 'number of electrons', value: '1', options: { morph: 'Hydrogen isotope' } } },
        { type: 'addAttribute', payload: { source: 'oxygen', name: 'number of protons', value: '8', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'oxygen', name: 'number of neutrons', value: '8', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'oxygen', name: 'number of electrons', value: '8', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'oxygen', name: 'number of protons', value: '8', options: { morph: 'Oxide ion' } } },
        { type: 'addAttribute', payload: { source: 'oxygen', name: 'number of neutrons', value: '8', options: { morph: 'Oxide ion' } } },
        { type: 'addAttribute', payload: { source: 'oxygen', name: 'number of electrons', value: '10', options: { morph: 'Oxide ion' } } },
        { type: 'addRelation', payload: { source: 'oxygen', target: 'water', name: 'part of', options: { morph: 'Oxide ion' } } },
        { type: 'addRelation', payload: { source: 'water', target: 'substance', name: 'is a type of', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'water', target: 'molecule', name: 'is a type of', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'water', name: 'chemical formula', value: '$\ce{H2O}$', options: { morph: 'basic' } } },
        { type: 'addAttribute', payload: { source: 'water', name: 'chemical formula', value: '$\ce{H3O+}$', options: { morph: 'hydronium' } } },
        { type: 'addAttribute', payload: { source: 'water', name: 'chemical formula', value: '$\ce{OH-}$', options: { morph: 'hydroxide' } } },
        { type: 'addAttribute', payload: { source: 'combustion_trigger', name: 'operator', value: '"OR"', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'combustion_trigger', target: 'spark', name: 'has operand', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'combustion_trigger', target: 'flame', name: 'has operand', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'electrolysis_of_water', target: 'water', name: 'has prior_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'electrolysis_of_water', target: 'electricity', name: 'has prior_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'electrolysis_of_water', target: 'hydrogen', name: 'has post_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'electrolysis_of_water', target: 'oxygen', name: 'has post_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'combustion', target: 'hydrogen', name: 'has prior_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'combustion', target: 'oxygen', name: 'has prior_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'combustion', target: 'combustion_trigger', name: 'has prior_state', options: { morph: 'basic' } } },
        { type: 'addRelation', payload: { source: 'combustion', target: 'water', name: 'has post_state', options: { morph: 'basic' } } },
    ];

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