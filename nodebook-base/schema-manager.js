const fs = require('fs').promises;
const path = require('path');

const SCHEMA_DIR = path.join(__dirname, 'schemas');
const RELATION_TYPES_FILE = path.join(SCHEMA_DIR, 'relation_types.json');
const ATTRIBUTE_TYPES_FILE = path.join(SCHEMA_DIR, 'attribute_types.json');
const NODE_TYPES_FILE = path.join(SCHEMA_DIR, 'node_types.json');
const FUNCTION_TYPES_FILE = path.join(SCHEMA_DIR, 'function_types.json');

async function readSchema(file) {
    try {
        const data = await fs.readFile(file, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        if (error.code === 'ENOENT') return [];
        throw error;
    }
}

async function writeSchema(file, data) {
    await fs.writeFile(file, JSON.stringify(data, null, 2));
}

// --- Node Types ---

async function getNodeTypes() {
    return await readSchema(NODE_TYPES_FILE);
}

// --- Relation Types ---

async function getRelationTypes() {
    return await readSchema(RELATION_TYPES_FILE);
}

async function addRelationType(type) {
    const types = await getRelationTypes();
    if (types.find(t => t.name === type.name)) {
        throw new Error('Relation type with this name already exists.');
    }
    types.push(type);
    await writeSchema(RELATION_TYPES_FILE, types);
    return type;
}

async function updateRelationType(name, updatedType) {
    let types = await getRelationTypes();
    const index = types.findIndex(t => t.name === name);
    if (index === -1) {
        throw new Error('Relation type not found.');
    }
    types[index] = updatedType;
    await writeSchema(RELATION_TYPES_FILE, types);
    return updatedType;
}

async function deleteRelationType(name) {
    let types = await getRelationTypes();
    const filteredTypes = types.filter(t => t.name !== name);
    if (types.length === filteredTypes.length) {
        throw new Error('Relation type not found.');
    }
    await writeSchema(RELATION_TYPES_FILE, filteredTypes);
}

// --- Attribute Types ---

async function getAttributeTypes() {
    return await readSchema(ATTRIBUTE_TYPES_FILE);
}

async function addAttributeType(type) {
    const types = await getAttributeTypes();
    if (types.find(t => t.name === type.name)) {
        throw new Error('Attribute type with this name already exists.');
    }
    types.push(type);
    await writeSchema(ATTRIBUTE_TYPES_FILE, types);
    return type;
}

async function updateAttributeType(name, updatedType) {
    let types = await getAttributeTypes();
    const index = types.findIndex(t => t.name === name);
    if (index === -1) {
        throw new Error('Attribute type not found.');
    }
    types[index] = updatedType;
    await writeSchema(ATTRIBUTE_TYPES_FILE, types);
    return updatedType;
}

async function deleteAttributeType(name) {
    let types = await getAttributeTypes();
    const filteredTypes = types.filter(t => t.name !== name);
    if (types.length === filteredTypes.length) {
        throw new Error('Attribute type not found.');
    }
    await writeSchema(ATTRIBUTE_TYPES_FILE, filteredTypes);
}

// --- Function Types ---

async function getFunctionTypes() {
    return await readSchema(FUNCTION_TYPES_FILE);
}

async function addFunctionType(type) {
    const types = await getFunctionTypes();
    if (types.find(t => t.name === type.name)) {
        throw new Error('Function type with this name already exists.');
    }
    types.push(type);
    await writeSchema(FUNCTION_TYPES_FILE, types);
    return type;
}

async function updateFunctionType(name, updatedType) {
    let types = await getFunctionTypes();
    const index = types.findIndex(t => t.name === name);
    if (index === -1) {
        throw new Error('Function type not found.');
    }
    types[index] = updatedType;
    await writeSchema(FUNCTION_TYPES_FILE, types);
    return updatedType;
}

async function deleteFunctionType(name) {
    let types = await getFunctionTypes();
    const filteredTypes = types.filter(t => t.name !== name);
    if (types.length === filteredTypes.length) {
        throw new Error('Function type not found.');
    }
    await writeSchema(FUNCTION_TYPES_FILE, filteredTypes);
}

module.exports = {
    getNodeTypes,
    getRelationTypes,
    addRelationType,
    updateRelationType,
    deleteRelationType,
    getAttributeTypes,
    addAttributeType,
    updateAttributeType,
    deleteAttributeType,
    getFunctionTypes,
    addFunctionType,
    updateFunctionType,
    deleteFunctionType,
};