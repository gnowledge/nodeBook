const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  username: 'testuser',
  password: 'testpass123'
};

let authToken = null;
let testGraphId = null;

// Helper function to make authenticated requests
async function authenticatedRequest(method, url, data = null) {
  const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
  
  try {
    if (method === 'GET') {
      return await axios.get(`${BASE_URL}${url}`, { headers });
    } else if (method === 'POST') {
      return await axios.post(`${BASE_URL}${url}`, data, { headers });
    } else if (method === 'PUT') {
      return await axios.put(`${BASE_URL}${url}`, data, { headers });
    } else if (method === 'DELETE') {
      return await axios.delete(`${BASE_URL}${url}`, { headers });
    }
  } catch (error) {
    if (error.response) {
      throw new Error(`HTTP ${error.response.status}: ${error.response.data.error || error.message}`);
    }
    throw error;
  }
}

// Test functions
async function testHealthCheck() {
  console.log('\n🧪 Testing Health Check...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/health`);
    console.log('✅ Health check passed');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Message: ${response.data.message}`);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    return false;
  }
}

async function testMindMapTemplates() {
  console.log('\n🧪 Testing MindMap Templates...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/mindmap/templates`);
    console.log('✅ MindMap templates retrieved');
    console.log(`   Available templates: ${Object.keys(response.data).join(', ')}`);
    return true;
  } catch (error) {
    console.error('❌ MindMap templates failed:', error.message);
    return false;
  }
}

async function testGraphCreation() {
  console.log('\n🧪 Testing Graph Creation...');
  
  try {
    const graphData = {
      name: 'Test Graph for Server',
      description: 'A test graph created via API'
    };
    
    const response = await authenticatedRequest('POST', '/api/graphs', graphData);
    console.log('✅ Graph created successfully');
    console.log(`   Graph ID: ${response.data.graph.id}`);
    console.log(`   Graph Name: ${response.data.graph.name}`);
    
    testGraphId = response.data.graph.id;
    return true;
  } catch (error) {
    console.error('❌ Graph creation failed:', error.message);
    return false;
  }
}

async function testGraphListing() {
  console.log('\n🧪 Testing Graph Listing...');
  
  try {
    const response = await authenticatedRequest('GET', '/api/graphs');
    console.log('✅ Graphs listed successfully');
    console.log(`   Found ${response.data.graphs.length} graphs`);
    
    response.data.graphs.forEach(graph => {
      console.log(`   - ${graph.name} (${graph.id})`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Graph listing failed:', error.message);
    return false;
  }
}

async function testNodeOperations() {
  console.log('\n🧪 Testing Node Operations...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping node operations - no test graph available');
    return false;
  }
  
  try {
    // Add a node
    const nodeData = {
      base_name: 'Test Node',
      options: { description: 'A test node created via API' }
    };
    
    const addResponse = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/nodes`, nodeData);
    console.log('✅ Node added successfully');
    console.log(`   Node ID: ${addResponse.data.node.id}`);
    console.log(`   Node Name: ${addResponse.data.node.base_name}`);
    
    const nodeId = addResponse.data.node.id;
    
    // Update the node
    const updateData = { description: 'Updated description via API' };
    const updateResponse = await authenticatedRequest('PUT', `/api/graphs/${testGraphId}/nodes/${nodeId}`, updateData);
    console.log('✅ Node updated successfully');
    console.log(`   Updated description: ${updateResponse.data.node.description}`);
    
    return true;
  } catch (error) {
    console.error('❌ Node operations failed:', error.message);
    return false;
  }
}

async function testRelationOperations() {
  console.log('\n🧪 Testing Relation Operations...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping relation operations - no test graph available');
    return false;
  }
  
  try {
    // First, add two nodes to create a relation between
    const node1Data = { base_name: 'Source Node', options: { description: 'Source for relation' } };
    const node2Data = { base_name: 'Target Node', options: { description: 'Target for relation' } };
    
    const node1Response = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/nodes`, node1Data);
    const node2Response = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/nodes`, node2Data);
    
    const sourceId = node1Response.data.node.id;
    const targetId = node2Response.data.node.id;
    
    // Create a relation
    const relationData = {
      source_id: sourceId,
      target_id: targetId,
      name: 'connects_to',
      options: { description: 'A test relation' }
    };
    
    const relationResponse = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/relations`, relationData);
    console.log('✅ Relation created successfully');
    console.log(`   Relation ID: ${relationResponse.data.relation.id}`);
    console.log(`   Relation: ${relationResponse.data.relation.source_id} -> ${relationResponse.data.relation.target_id}`);
    
    return true;
  } catch (error) {
    console.error('❌ Relation operations failed:', error.message);
    return false;
  }
}

async function testAttributeOperations() {
  console.log('\n🧪 Testing Attribute Operations...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping attribute operations - no test graph available');
    return false;
  }
  
  try {
    // Add a node first
    const nodeData = { base_name: 'Attribute Test Node', options: { description: 'Node for testing attributes' } };
    const nodeResponse = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/nodes`, nodeData);
    const nodeId = nodeResponse.data.node.id;
    
    // Add an attribute
    const attributeData = {
      source_id: nodeId,
      attributeName: 'priority',
      attributeValue: 'high',
      options: { description: 'Priority level' }
    };
    
    const attributeResponse = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/attributes`, attributeData);
    console.log('✅ Attribute added successfully');
    console.log(`   Attribute ID: ${attributeResponse.data.attribute.id}`);
    console.log(`   Attribute: ${attributeResponse.data.attribute.name} = ${attributeResponse.data.attribute.value}`);
    
    return true;
  } catch (error) {
    console.error('❌ Attribute operations failed:', error.message);
    return false;
  }
}

async function testFunctionOperations() {
  console.log('\n🧪 Testing Function Operations...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping function operations - no test graph available');
    return false;
  }
  
  try {
    // Add a node first
    const nodeData = { base_name: 'Function Test Node', options: { description: 'Node for testing functions' } };
    const nodeResponse = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/nodes`, nodeData);
    const nodeId = nodeResponse.data.node.id;
    
    // Add an attribute to use in the function
    const attributeData = {
      source_id: nodeId,
      attributeName: 'base_value',
      attributeValue: '5',
      options: { description: 'Base value for calculation' }
    };
    
    await authenticatedRequest('POST', `/api/graphs/${testGraphId}/attributes`, attributeData);
    
    // Apply a function
    const functionData = {
      source_id: nodeId,
      name: 'calculated_value',
      expression: '2 * base_value',
      options: { description: 'Calculate double the base value' }
    };
    
    const functionResponse = await authenticatedRequest('POST', `/api/graphs/${testGraphId}/functions`, functionData);
    console.log('✅ Function applied successfully');
    console.log(`   Function: ${functionResponse.data.function.name} = ${functionResponse.data.function.value}`);
    console.log(`   Expression: ${functionResponse.data.function.expression}`);
    
    return true;
  } catch (error) {
    console.error('❌ Function operations failed:', error.message);
    return false;
  }
}

async function testCollaborationFeatures() {
  console.log('\n🧪 Testing Collaboration Features...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping collaboration tests - no test graph available');
    return false;
  }
  
  try {
    // Create a collaboration session
    const collaborationData = {
      graphId: testGraphId,
      permissions: { edit: true, view: true }
    };
    
    const createResponse = await authenticatedRequest('POST', '/api/collaboration/create', collaborationData);
    console.log('✅ Collaboration session created');
    console.log(`   Session ID: ${createResponse.data.collaboration.sessionId}`);
    console.log(`   Share ID: ${createResponse.data.collaboration.shareLink.id}`);
    
    // Get collaboration status
    const statusResponse = await authenticatedRequest('GET', `/api/collaboration/status/${testGraphId}`);
    console.log('✅ Collaboration status retrieved');
    console.log(`   Graph ID: ${statusResponse.data.status.graphId}`);
    console.log(`   Share Links: ${statusResponse.data.status.shareLinks.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Collaboration features failed:', error.message);
    return false;
  }
}

async function testGraphRetrieval() {
  console.log('\n🧪 Testing Graph Retrieval...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping graph retrieval - no test graph available');
    return false;
  }
  
  try {
    const response = await authenticatedRequest('GET', `/api/graphs/${testGraphId}`);
    console.log('✅ Graph retrieved successfully');
    console.log(`   Graph ID: ${response.data.graph.id}`);
    console.log(`   Nodes: ${response.data.graph.nodes.length}`);
    console.log(`   Relations: ${response.data.graph.relations.length}`);
    console.log(`   Attributes: ${response.data.graph.attributes.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Graph retrieval failed:', error.message);
    return false;
  }
}

async function testCleanup() {
  console.log('\n🧪 Testing Cleanup...');
  
  if (!testGraphId) {
    console.log('⚠️ Skipping cleanup - no test graph available');
    return false;
  }
  
  try {
    await authenticatedRequest('DELETE', `/api/graphs/${testGraphId}`);
    console.log('✅ Test graph deleted successfully');
    return true;
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 Starting NodeBook SimpleGraph Server Tests...');
  console.log(`📍 Testing server at: ${BASE_URL}`);
  
  const results = [];
  
  // Run all tests
  results.push(await testHealthCheck());
  results.push(await testMindMapTemplates());
  results.push(await testGraphCreation());
  results.push(await testGraphListing());
  results.push(await testNodeOperations());
  results.push(await testRelationOperations());
  results.push(await testAttributeOperations());
  results.push(await testFunctionOperations());
  results.push(await testCollaborationFeatures());
  results.push(await testGraphRetrieval());
  results.push(await testCleanup());
  
  // Summary
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log('\n📊 Test Results Summary');
  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! SimpleGraph server is working correctly.');
  } else {
    console.log('\n⚠️ Some tests failed. Please check the server logs for details.');
  }
  
  return passed === total;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch(console.error);
}

module.exports = { runAllTests };
