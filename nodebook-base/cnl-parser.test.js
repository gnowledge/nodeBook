const { diffCnl } = require('./cnl-parser');

describe('CNL Parser', () => {
  describe('Node Parsing', () => {
    test('should create a simple node', async () => {
      const { operations } = await diffCnl('', '# My Node');
      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe('addNode');
      expect(operations[0].payload.base_name).toBe('My Node');
    });

    test('should create a node with a type', async () => {
      const { operations } = await diffCnl('', '# My Node [Person]');
      expect(operations[0].payload.options.role).toBe('Person');
    });
  });

  describe('Attribute Parsing', () => {
    test('should create a simple attribute', async () => {
      const { operations } = await diffCnl('', '# My Node\n  has name: "John Doe";');
      const addAttributeOp = operations.find(op => op.type === 'addAttribute');
      expect(addAttributeOp).toBeDefined();
      expect(addAttributeOp.payload.name).toBe('name');
      expect(addAttributeOp.payload.value).toBe('"John Doe"');
    });

    test('should create a description attribute', async () => {
        const { operations } = await diffCnl('', '# My Node\n```description\nThis is a test.\n```');
        const updateNodeOp = operations.find(op => op.type === 'updateNode');
        expect(updateNodeOp).toBeDefined();
        expect(updateNodeOp.payload.fields.description).toBe('This is a test.');
    });
  });

  describe('Relation Parsing', () => {
    test('should create a simple relation', async () => {
      const { operations } = await diffCnl('', '# Node A\n<knows> Node B;');
      const addRelationOp = operations.find(op => op.type === 'addRelation');
      expect(addRelationOp).toBeDefined();
      expect(addRelationOp.payload.name).toBe('knows');
      expect(addRelationOp.payload.target).toBe('node_b');
    });
  });

  describe('Function Parsing', () => {
    test('should apply a function to a node', async () => {
      const { operations } = await diffCnl('', '# My Node\n  has function "atomicMass";');
      const applyFunctionOp = operations.find(op => op.type === 'applyFunction');
      expect(applyFunctionOp).toBeDefined();
      expect(applyFunctionOp.payload.name).toBe('atomicMass');
    });
  });

  describe('Diffing and Deletion', () => {
    test('should generate a delete operation for a removed node', async () => {
      const oldCnl = '# Node A\n# Node B';
      const newCnl = '# Node B';
      const { operations } = await diffCnl(oldCnl, newCnl);
      const deleteNodeOp = operations.find(op => op.type === 'deleteNode');
      expect(deleteNodeOp).toBeDefined();
      expect(deleteNodeOp.payload.id).toBe('node_a');
    });

    test('should generate a delete operation for a removed attribute', async () => {
        const oldCnl = '# Node A\n  has name: "John Doe";\n  has age: 30;';
        const newCnl = '# Node A\n  has name: "John Doe";';
        const { operations } = await diffCnl(oldCnl, newCnl);
        const deleteAttributeOp = operations.find(op => op.type === 'deleteAttribute');
        expect(deleteAttributeOp).toBeDefined();
    });

    test('should generate a delete operation for a removed relation', async () => {
        const oldCnl = '# Node A\n<knows> Node B;\n<likes> Node C;';
        const newCnl = '# Node A\n<knows> Node B;';
        const { operations } = await diffCnl(oldCnl, newCnl);
        const deleteRelationOp = operations.find(op => op.type === 'deleteRelation');
        expect(deleteRelationOp).toBeDefined();
    });
  });
});
