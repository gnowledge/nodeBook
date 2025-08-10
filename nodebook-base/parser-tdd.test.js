const { diffCnl } = require('./cnl-parser');

describe('CNL Diff Parser (TDD)', () => {
  test('should correctly identify a deleted node and its attributes and relations', async () => {
    const oldCnl = `
# Hydrogen [Element]
  has number of protons: 1;
  <is_a> Chemical Element;

# Oxygen [Element]
  has number of protons: 8;
    `;

    const newCnl = `
# Oxygen [Element]
  has number of protons: 8;
    `;

    const { operations } = await diffCnl(oldCnl, newCnl);

    const deleteNodeOp = operations.find(op => op.type === 'deleteNode');
    const deleteAttributeOp = operations.find(op => op.type === 'deleteAttribute');
    const deleteRelationOp = operations.find(op => op.type === 'deleteRelation');

    expect(deleteNodeOp).toBeDefined();
    expect(deleteNodeOp.payload.id).toBe('hydrogen');
    expect(deleteAttributeOp).toBeDefined();
    expect(deleteRelationOp).toBeDefined();
  });

  test('should correctly identify a deleted attribute', async () => {
    const oldCnl = `
# Hydrogen [Element]
  has number of protons: 1;
  has number of neutrons: 0;
    `;

    const newCnl = `
# Hydrogen [Element]
  has number of protons: 1;
    `;

    const { operations } = await diffCnl(oldCnl, newCnl);

    const deleteAttributeOp = operations.find(op => op.type === 'deleteAttribute');
    
    expect(deleteAttributeOp).toBeDefined();
  });

  test('should correctly identify a deleted relation', async () => {
    const oldCnl = `
# Hydrogen [Element]
  <is_a> Chemical Element;
  <is_a> Gas;
    `;

    const newCnl = `
# Hydrogen [Element]
  <is_a> Chemical Element;
    `;

    const { operations } = await diffCnl(oldCnl, newCnl);

    const deleteRelationOp = operations.find(op => op.type === 'deleteRelation');

    expect(deleteRelationOp).toBeDefined();
  });
});