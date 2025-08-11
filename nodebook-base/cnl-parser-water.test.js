const { getNodeCnl } = require('./graph-manager');
const fs = require('fs');

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
  },
}));

describe('cnl-parser water', () => {
  it('should correctly extract the CNL for the "Water" node', async () => {
    const sourceCnl = `# Hydrogen [Element]
has number of protons: 1;
has number of electrons: 1;
has number of neutrons: 0;

## Hydrogen ion
has number of protons: 1;
has number of neutrons: 0;
has number of electrons: 0;
<part of> Water;

## Hydrogen isotope
has number of protons: 1;
has number of neutrons: 1;
has number of electrons: 1;

# Oxygen [Element]
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 8;

## Oxide ion
has number of protons: 8;
has number of neutrons: 8;
has number of electrons: 10;
<part of> Water;

# Water [Class]
\
description
Water is the elixir of life.
\
<is a type of> Substance;
<is a type of> Molecule;
has chemical formula: $\\ce{H2O}$; 

## hydronium
has chemical formula: $\\ce{H3O+}$;

## hydroxide
has chemical formula: $\\ce{OH-}$;

# Combustion Trigger [LogicalOperator]
has operator: "OR";
<has operand> Spark;
<has operand> Flame;

# Electrolysis of Water [Transition]
<has prior_state> Water;
<has prior_state> Electricity;
<has post_state> Hydrogen;
<has post_state> Oxygen;

# Combustion [Transition]
<has prior_state> Hydrogen;
<has prior_state> Oxygen;
<has prior_state> Combustion Trigger;
<has post_state> Water;

# Spark [Energy]
# Flame [Energy]
# Electricity [Energy]`;

    const expectedWaterCnl = `# Water [Class]
\
description
Water is the elixir of life.
\
<is a type of> Substance;
<is a type of> Molecule;
has chemical formula: $\\ce{H2O}$; 

## hydronium
has chemical formula: $\\ce{H3O+}$;

## hydroxide
has chemical formula: $\\ce{OH-}$;`;

    fs.promises.readFile.mockImplementation((filePath) => {
        if (filePath.endsWith('graph.cnl')) {
            return Promise.resolve(sourceCnl);
        }
        if (filePath.endsWith('registry.json')) {
            return Promise.resolve(JSON.stringify([{ id: 'test-graph', path: '/fake/path' }]));
        }
        if (filePath.endsWith('node_registry.json')) {
            return Promise.resolve(JSON.stringify({ 'water-id': { base_name: 'Water' } }));
        }
        return Promise.reject(new Error(`Unexpected readFile call: ${filePath}`));
    });

    const cnl = await getNodeCnl('test-graph', 'water-id');
    expect(cnl.trim()).toBe(expectedWaterCnl.trim());
  });
});
