import { Injectable } from '@nestjs/common';

// Import the existing schema-manager.js module
const schemaManager = require('../../../../schema-manager.js');

@Injectable()
export class SchemaService {
  // Relation Types
  async getRelationTypes() {
    return schemaManager.getRelationTypes();
  }

  async getRelationType(name: string) {
    const relationTypes = await schemaManager.getRelationTypes();
    const relationType = relationTypes.find(t => t.name === name);
    if (!relationType) {
      throw new Error('Relation type not found');
    }
    return relationType;
  }

  async createRelationType(createRelationTypeDto: any) {
    return schemaManager.addRelationType(createRelationTypeDto);
  }

  async updateRelationType(name: string, updateRelationTypeDto: any) {
    return schemaManager.updateRelationType(name, updateRelationTypeDto);
  }

  async deleteRelationType(name: string) {
    return schemaManager.deleteRelationType(name);
  }

  // Attribute Types
  async getAttributeTypes() {
    return schemaManager.getAttributeTypes();
  }

  async getAttributeType(name: string) {
    const attributeTypes = await schemaManager.getAttributeTypes();
    const attributeType = attributeTypes.find(t => t.name === name);
    if (!attributeType) {
      throw new Error('Attribute type not found');
    }
    return attributeType;
  }

  async createAttributeType(createAttributeTypeDto: any) {
    return schemaManager.addAttributeType(createAttributeTypeDto);
  }

  async updateAttributeType(name: string, updateAttributeTypeDto: any) {
    return schemaManager.updateAttributeType(name, updateAttributeTypeDto);
  }

  async deleteAttributeType(name: string) {
    return schemaManager.deleteAttributeType(name);
  }

  // Node Types
  async getNodeTypes() {
    return schemaManager.getNodeTypes();
  }

  async getNodeType(name: string) {
    const nodeTypes = await schemaManager.getNodeTypes();
    const nodeType = nodeTypes.find(t => t.name === name);
    if (!nodeType) {
      throw new Error('Node type not found');
    }
    return nodeType;
  }

  async createNodeType(createNodeTypeDto: any) {
    return schemaManager.addNodeType(createNodeTypeDto);
  }

  async updateNodeType(name: string, updateNodeTypeDto: any) {
    return schemaManager.updateNodeType(name, updateNodeTypeDto);
  }

  async deleteNodeType(name: string) {
    return schemaManager.deleteNodeType(name);
  }

  // Function Types
  async getFunctionTypes() {
    return schemaManager.getFunctionTypes();
  }

  async getFunctionType(name: string) {
    const functionTypes = await schemaManager.getFunctionTypes();
    const functionType = functionTypes.find(t => t.name === name);
    if (!functionType) {
      throw new Error('Function type not found');
    }
    return functionType;
  }

  async createFunctionType(createFunctionTypeDto: any) {
    return schemaManager.addFunctionType(createFunctionTypeDto);
  }

  async updateFunctionType(name: string, updateFunctionTypeDto: any) {
    return schemaManager.updateFunctionType(name, updateFunctionTypeDto);
  }

  async deleteFunctionType(name: string) {
    return schemaManager.deleteFunctionType(name);
  }
}
