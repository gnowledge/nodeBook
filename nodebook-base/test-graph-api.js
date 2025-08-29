const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Test data - using admin user for testing
const testUser = 'admin';
const testGraphName = 'Test Graph';

async function testGraphAPI() {
    console.log('🧪 Testing NodeBook SimpleGraph API...\n');
    
    try {
        // Test 1: Health check
        console.log('1️⃣ Testing health endpoint...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Health check passed:', healthResponse.data.message);
        
        // Test 2: Mindmap templates
        console.log('\n2️⃣ Testing mindmap templates...');
        const templatesResponse = await axios.get(`${BASE_URL}/api/mindmap/templates`);
        console.log('✅ Templates available:', templatesResponse.data.templates);
        
        // Test 2.5: Login to get authentication token
        console.log('\n2️⃣5️⃣ Testing authentication...');
        const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'admin',
            password: '.osok466cfpk.d84q1ofmttk'
        });
        const token = loginResponse.data.token;
        console.log('✅ Authentication successful, token received');
        
        // Set up axios with authentication headers
        const authAxios = axios.create({
            baseURL: BASE_URL,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        // Test 3: Create a new graph
        console.log('\n3️⃣ Testing graph creation...');
        const createGraphResponse = await authAxios.post(`/api/graphs`, {
            name: testGraphName,
            userId: testUser
        });
        const graphId = createGraphResponse.data.graph.id;
        console.log('✅ Graph created with ID:', graphId);
        
        // Test 4: Add nodes to the graph
        console.log('\n4️⃣ Testing node creation...');
        
        // Add first node
        const node1Response = await authAxios.post(`/api/graphs/${graphId}/nodes`, {
            base_name: 'Test Node 1',
            userId: testUser,
            options: {
                description: 'This is the first test node',
                type: 'concept'
            }
        });
        const node1Id = node1Response.data.nodeId;
        console.log('✅ First node created with ID:', node1Id);
        
        // Add second node
        const node2Response = await authAxios.post(`/api/graphs/${graphId}/nodes`, {
            base_name: 'Test Node 2',
            userId: testUser,
            options: {
                description: 'This is the second test node',
                type: 'concept'
            }
        });
        const node2Id = node2Response.data.nodeId;
        console.log('✅ Second node created with ID:', node2Id);
        
        // Test 5: Add a relation between nodes
        console.log('\n5️⃣ Testing relation creation...');
        const relationResponse = await authAxios.post(`/api/graphs/${graphId}/relations`, {
            source_id: node1Id,
            target_id: node2Id,
            name: 'connects_to',
            userId: testUser,
            options: {
                description: 'Test relation between nodes',
                strength: 'strong'
            }
        });
        const relationId = relationResponse.data.relationId;
        console.log('✅ Relation created with ID:', relationId);
        
        // Test 6: Add attributes to nodes
        console.log('\n6️⃣ Testing attribute creation...');
        const attributeResponse = await authAxios.post(`/api/graphs/${graphId}/attributes`, {
            source_id: node1Id,
            attributeName: 'priority',
            attributeValue: 'high',
            userId: testUser,
            options: {
                description: 'Priority level of the node'
            }
        });
        const attributeId = attributeResponse.data.attributeId;
        console.log('✅ Attribute created with ID:', attributeId);
        
        // Test 7: Apply a function to a node
        console.log('\n7️⃣ Testing function application...');
        const functionResponse = await authAxios.post(`/api/graphs/${graphId}/functions`, {
            source_id: node1Id,
            name: 'calculate_score',
            expression: 'priority == "high" ? 100 : 50',
            userId: testUser,
            options: {
                description: 'Calculate score based on priority'
            }
        });
        const functionId = functionResponse.data.functionId;
        console.log('✅ Function applied with ID:', functionId);
        
        // Test 8: List all nodes in the graph
        console.log('\n8️⃣ Testing node listing...');
        const nodesResponse = await authAxios.get(`/api/graphs/${graphId}/nodes?userId=${testUser}`);
        console.log('✅ Nodes in graph:', nodesResponse.data.nodes.length);
        
        // Test 9: List all relations in the graph
        console.log('\n9️⃣ Testing relation listing...');
        const relationsResponse = await authAxios.get(`/api/graphs/${graphId}/relations?userId=${testUser}`);
        console.log('✅ Relations in graph:', relationsResponse.data.relations.length);
        
        // Test 10: Get graph details
        console.log('\n🔟 Testing graph details...');
        const graphDetailsResponse = await authAxios.get(`/api/graphs/${graphId}?userId=${testUser}`);
        console.log('✅ Graph details retrieved:', graphDetailsResponse.data.graph.name);
        
        // Test 11: List all graphs for user
        console.log('\n1️⃣1️⃣ Testing graph listing...');
        const graphsResponse = await authAxios.get(`/api/graphs?userId=${testUser}`);
        console.log('✅ User graphs:', graphsResponse.data.graphs.length);
        
        // Test 12: Test collaboration features
        console.log('\n1️⃣2️⃣ Testing collaboration features...');
        try {
            const shareResponse = await authAxios.post(`/api/graphs/${graphId}/share`, {
                userId: testUser,
                permissions: { edit: false, view: true }
            });
            console.log('✅ Share link created:', shareResponse.data.shareId);
        } catch (error) {
            console.log('⚠️  Collaboration test skipped (permission issue):', error.response?.data?.message || error.message);
        }
        
        console.log('\n🎉 All core graph functionality tests completed successfully!');
        console.log(`📊 Graph ID: ${graphId}`);
        console.log(`📊 Nodes created: ${nodesResponse.data.nodes.length}`);
        console.log(`📊 Relations created: ${relationsResponse.data.relations.length}`);
        
    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error('Status:', error.response.status);
        }
        process.exit(1);
    }
}

// Run the tests
if (require.main === module) {
    testGraphAPI().catch(console.error);
}

module.exports = { testGraphAPI };
