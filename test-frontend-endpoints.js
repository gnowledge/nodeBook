#!/usr/bin/env node

/**
 * Frontend Endpoint Testing Suite
 * 
 * This script tests all backend endpoints through the Vite proxy (localhost:5173)
 * exactly as the frontend would call them. This helps identify data format mismatches
 * and ensures the proxy is working correctly.
 */

const axios = require('axios');

// Configuration
const FRONTEND_URL = 'http://localhost:5173';
const TEST_TOKEN = 'test-jwt-token-for-admin';

// Test results storage
const testResults = {
    passed: 0,
    failed: 0,
    details: []
};

// Helper function to log test results
function logTest(name, success, details = '') {
    const status = success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${name}`);
    if (details) console.log(`   ${details}`);
    
    testResults.details.push({ name, success, details });
    if (success) testResults.passed++; else testResults.failed++;
}

// Helper function to make authenticated requests
async function authenticatedRequest(method, endpoint, data = null) {
    try {
        const config = {
            method,
            url: `${FRONTEND_URL}${endpoint}`,
            headers: {
                'Authorization': `Bearer ${TEST_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data || error.message, 
            status: error.response?.status 
        };
    }
}

// Test 1: Health Check
async function testHealthCheck() {
    console.log('\n🔍 Testing Health Check...');
    
    try {
        const response = await axios.get(`${FRONTEND_URL}/api/health`);
        const success = response.status === 200 && response.data.message;
        logTest('Health Check', success, `Status: ${response.status}, Message: ${response.data.message}`);
        return success;
    } catch (error) {
        logTest('Health Check', false, `Error: ${error.message}`);
        return false;
    }
}

// Test 2: Authentication Endpoints
async function testAuthEndpoints() {
    console.log('\n🔐 Testing Authentication Endpoints...');
    
    // Test login
    const loginResult = await authenticatedRequest('POST', '/api/auth/login', {
        username: 'admin',
        password: 'admin123'
    });
    logTest('Login Endpoint', loginResult.success, 
        loginResult.success ? `Status: ${loginResult.status}` : `Error: ${loginResult.error}`);
    
    // Test user profile
    const profileResult = await authenticatedRequest('GET', '/api/auth/me');
    logTest('User Profile Endpoint', profileResult.success,
        profileResult.success ? `Status: ${profileResult.status}` : `Error: ${profileResult.error}`);
    
    return loginResult.success && profileResult.success;
}

// Test 3: Graph Management Endpoints
async function testGraphEndpoints() {
    console.log('\n📊 Testing Graph Management Endpoints...');
    
    // Test graph creation
    const createResult = await authenticatedRequest('POST', '/api/graphs', {
        name: 'Test Graph for Frontend Testing'
    });
    logTest('Graph Creation', createResult.success,
        createResult.success ? `Status: ${createResult.status}, Graph ID: ${createResult.data?.graph?.id}` : `Error: ${createResult.error}`);
    
    if (!createResult.success) return false;
    
    const graphId = createResult.data?.graph?.id;
    
    // Test graph listing
    const listResult = await authenticatedRequest('GET', '/api/graphs');
    logTest('Graph Listing', listResult.success,
        listResult.success ? `Status: ${listResult.status}, Graphs: ${listResult.data?.graphs?.length || 0}` : `Error: ${listResult.error}`);
    
    // Test individual graph retrieval
    const getResult = await authenticatedRequest('GET', `/api/graphs/${graphId}`);
    logTest('Graph Retrieval', getResult.success,
        getResult.success ? `Status: ${getResult.status}` : `Error: ${getResult.error}`);
    
    return createResult.success && listResult.success && getResult.success;
}

// Test 4: Graph Data Endpoints
async function testGraphDataEndpoints() {
    console.log('\n🔍 Testing Graph Data Endpoints...');
    
    const graphId = 'graph_1'; // Use existing test graph
    
    // Test graph data
    const graphDataResult = await authenticatedRequest('GET', `/api/graphs/${graphId}/graph`);
    logTest('Graph Data Endpoint', graphDataResult.success,
        graphDataResult.success ? `Status: ${graphDataResult.status}, Nodes: ${graphDataResult.data?.nodes?.length || 0}` : `Error: ${graphDataResult.error}`);
    
    // Test CNL content
    const cnlResult = await authenticatedRequest('GET', `/api/graphs/${graphId}/cnl`);
    logTest('CNL Content Endpoint', cnlResult.success,
        cnlResult.success ? `Status: ${cnlResult.status}` : `Error: ${cnlResult.error}`);
    
    // Test graph key
    const keyResult = await authenticatedRequest('GET', `/api/graphs/${graphId}/key`);
    logTest('Graph Key Endpoint', keyResult.success,
        keyResult.success ? `Status: ${keyResult.status}` : `Error: ${keyResult.error}`);
    
    // Test thumbnail
    const thumbnailResult = await authenticatedRequest('GET', `/api/graphs/${graphId}/thumbnail`);
    logTest('Thumbnail Endpoint', thumbnailResult.success,
        thumbnailResult.success ? `Status: ${thumbnailResult.status}` : `Error: ${thumbnailResult.error}`);
    
    return graphDataResult.success && cnlResult.success && keyResult.success && thumbnailResult.success;
}

// Test 5: CNL Processing
async function testCNLProcessing() {
    console.log('\n📝 Testing CNL Processing...');
    
    const graphId = 'graph_1';
    
    const cnlResult = await authenticatedRequest('POST', `/api/graphs/${graphId}/cnl`, {
        cnlText: '# Test Node\n- test_node: A test node for frontend testing\n- test_node is_a concept',
        strictMode: false
    });
    
    logTest('CNL Processing', cnlResult.success,
        cnlResult.success ? `Status: ${cnlResult.status}, Message: ${cnlResult.data?.message}` : `Error: ${cnlResult.error}`);
    
    return cnlResult.success;
}

// Test 6: Schema Endpoints
async function testSchemaEndpoints() {
    console.log('\n🏗️ Testing Schema Endpoints...');
    
    // Test node types
    const nodeTypesResult = await axios.get(`${FRONTEND_URL}/api/schema/nodetypes`);
    logTest('Node Types Schema', nodeTypesResult.status === 200,
        `Status: ${nodeTypesResult.status}, Types: ${nodeTypesResult.data?.nodetypes?.length || 0}`);
    
    // Test relation types
    const relationTypesResult = await axios.get(`${FRONTEND_URL}/api/schema/relations`);
    logTest('Relation Types Schema', relationTypesResult.status === 200,
        `Status: ${relationTypesResult.status}, Types: ${relationTypesResult.data?.relations?.length || 0}`);
    
    // Test attribute types
    const attributeTypesResult = await axios.get(`${FRONTEND_URL}/api/schema/attributes`);
    logTest('Attribute Types Schema', attributeTypesResult.status === 200,
        `Status: ${attributeTypesResult.status}, Types: ${attributeTypesResult.data?.attributes?.length || 0}`);
    
    return nodeTypesResult.status === 200 && relationTypesResult.status === 200 && attributeTypesResult.status === 200;
}

// Test 7: Data Format Validation
async function testDataFormats() {
    console.log('\n📋 Testing Data Format Validation...');
    
    // Test graph listing format
    const listResult = await authenticatedRequest('GET', '/api/graphs');
    if (listResult.success) {
        const hasSuccessField = 'success' in listResult.data;
        const hasGraphsField = 'graphs' in listResult.data;
        const graphsIsArray = Array.isArray(listResult.data.graphs);
        
        logTest('Graph List Format', hasSuccessField && hasGraphsField && graphsIsArray,
            `Success field: ${hasSuccessField}, Graphs field: ${hasGraphsField}, Is array: ${graphsIsArray}`);
        
        if (graphsIsArray && listResult.data.graphs.length > 0) {
            const firstGraph = listResult.data.graphs[0];
            const hasRequiredFields = firstGraph.id && firstGraph.name && firstGraph.userId;
            logTest('Graph Object Structure', hasRequiredFields,
                `Has id: ${!!firstGraph.id}, Has name: ${!!firstGraph.name}, Has userId: ${!!firstGraph.userId}`);
        }
    }
    
    // Test graph data format
    const graphDataResult = await authenticatedRequest('GET', '/api/graphs/graph_1/graph');
    if (graphDataResult.success) {
        const hasNodes = 'nodes' in graphDataResult.data;
        const hasEdges = 'edges' in graphDataResult.data;
        const nodesIsArray = Array.isArray(graphDataResult.data.nodes);
        const edgesIsArray = Array.isArray(graphDataResult.data.edges);
        
        logTest('Graph Data Format', hasNodes && hasEdges && nodesIsArray && edgesIsArray,
            `Has nodes: ${hasNodes}, Has edges: ${hasEdges}, Nodes array: ${nodesIsArray}, Edges array: ${edgesIsArray}`);
        
        if (nodesIsArray && graphDataResult.data.nodes.length > 0) {
            const firstNode = graphDataResult.data.nodes[0];
            const hasNameField = 'name' in firstNode;
            logTest('Node Object Structure', hasNameField,
                `Node has name field: ${hasNameField}, Value: ${firstNode.name}`);
        }
        
        if (edgesIsArray && graphDataResult.data.edges.length > 0) {
            const firstEdge = graphDataResult.data.edges[0];
            const hasRequiredFields = 'source_id' in firstEdge && 'target_id' in firstEdge && 'name' in firstEdge;
            logTest('Edge Object Structure', hasRequiredFields,
                `Edge has required fields: ${hasRequiredFields}, Name: ${firstEdge.name}`);
        }
    }
}

// Test 8: Error Handling
async function testErrorHandling() {
    console.log('\n⚠️ Testing Error Handling...');
    
    // Test invalid token
    const invalidTokenResult = await axios.get(`${FRONTEND_URL}/api/graphs`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
    }).catch(error => error.response);
    
    logTest('Invalid Token Handling', invalidTokenResult.status === 401,
        `Status: ${invalidTokenResult.status}, Expected: 401`);
    
    // Test missing token
    const missingTokenResult = await axios.get(`${FRONTEND_URL}/api/graphs`).catch(error => error.response);
    logTest('Missing Token Handling', missingTokenResult.status === 401,
        `Status: ${missingTokenResult.status}, Expected: 401`);
}

// Main test runner
async function runAllTests() {
    console.log('🚀 Starting Frontend Endpoint Testing Suite...');
    console.log(`🎯 Testing through Vite proxy: ${FRONTEND_URL}`);
    console.log(`🔑 Using test token: ${TEST_TOKEN}`);
    
    try {
        // Run all tests
        await testHealthCheck();
        await testAuthEndpoints();
        await testGraphEndpoints();
        await testGraphDataEndpoints();
        await testCNLProcessing();
        await testSchemaEndpoints();
        await testDataFormats();
        await testErrorHandling();
        
        // Print summary
        console.log('\n📊 Test Results Summary:');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)}%`);
        
        if (testResults.failed > 0) {
            console.log('\n❌ Failed Tests:');
            testResults.details
                .filter(test => !test.success)
                .forEach(test => console.log(`   - ${test.name}: ${test.details}`));
        }
        
        console.log('\n🎯 Next Steps:');
        if (testResults.failed === 0) {
            console.log('   ✅ All tests passed! Frontend should work correctly.');
        } else {
            console.log('   🔧 Fix the failed tests above to resolve frontend issues.');
            console.log('   📋 Check data format mismatches between backend and frontend expectations.');
        }
        
    } catch (error) {
        console.error('💥 Test suite crashed:', error.message);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    runAllTests();
}

module.exports = {
    runAllTests,
    testResults
};
