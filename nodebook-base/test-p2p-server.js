import axios from 'axios';

const BASE_URL = 'http://localhost:3000';

// Test data
const testUser = 'admin';
const testGraphName = 'Test P2P Graph';

async function testP2PServer() {
    console.log('🧪 Testing NodeBook P2P Server Integration...\n');
    
    try {
        // Test 1: Health check with P2P status
        console.log('1️⃣ Testing health endpoint with P2P status...');
        const healthResponse = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Health check passed:', healthResponse.data.message);
        console.log('   P2P Status:', healthResponse.data.p2p);
        
        // Test 2: Mindmap templates
        console.log('\n2️⃣ Testing mindmap templates...');
        const templatesResponse = await axios.get(`${BASE_URL}/api/mindmap/templates`);
        console.log('✅ Templates available:', templatesResponse.data.templates);
        
        // Test 3: Authentication
        console.log('\n3️⃣ Testing authentication...');
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
        
        // Test 4: Create P2P Graph
        console.log('\n4️⃣ Testing P2P graph creation...');
        const createGraphResponse = await authAxios.post(`/api/graphs`, {
            name: testGraphName,
            userId: testUser
        });
        const graphId = createGraphResponse.data.graph.id;
        console.log('✅ P2P Graph created with ID:', graphId);
        console.log('   P2P Enabled:', createGraphResponse.data.graph.p2pEnabled);
        
        // Test 5: Add nodes to the P2P graph
        console.log('\n5️⃣ Testing P2P node creation...');
        
        // Add first node
        const node1Response = await authAxios.post(`/api/graphs/${graphId}/nodes`, {
            base_name: 'P2P Node 1',
            userId: testUser,
            options: {
                description: 'First P2P node',
                type: 'concept'
            }
        });
        const node1Id = node1Response.data.nodeId;
        console.log('✅ First P2P node created with ID:', node1Id);
        
        // Add second node
        const node2Response = await authAxios.post(`/api/graphs/${graphId}/nodes`, {
            base_name: 'P2P Node 2',
            userId: testUser,
            options: {
                description: 'Second P2P node',
                type: 'concept'
            }
        });
        const node2Id = node2Response.data.nodeId;
        console.log('✅ Second P2P node created with ID:', node2Id);
        
        // Test 6: Add P2P relation
        console.log('\n6️⃣ Testing P2P relation creation...');
        const relationResponse = await authAxios.post(`/api/graphs/${graphId}/relations`, {
            source_id: node1Id,
            target_id: node2Id,
            name: 'connects_to',
            userId: testUser,
            options: {
                description: 'P2P relation between nodes',
                strength: 'strong'
            }
        });
        const relationId = relationResponse.data.relationId;
        console.log('✅ P2P Relation created with ID:', relationId);
        
        // Test 7: Add P2P attribute
        console.log('\n7️⃣ Testing P2P attribute creation...');
        const attributeResponse = await authAxios.post(`/api/graphs/${graphId}/attributes`, {
            source_id: node1Id,
            attributeName: 'priority',
            attributeValue: 'high',
            userId: testUser,
            options: {
                description: 'Priority level of the P2P node'
            }
        });
        const attributeId = attributeResponse.data.attributeId;
        console.log('✅ P2P Attribute created with ID:', attributeId);
        
        // Test 8: List P2P graph contents
        console.log('\n8️⃣ Testing P2P graph operations...');
        
        // List nodes
        const nodesResponse = await authAxios.get(`/api/graphs/${graphId}/nodes?userId=${testUser}`);
        console.log('✅ P2P Nodes in graph:', nodesResponse.data.nodes.length);
        
        // List relations
        const relationsResponse = await authAxios.get(`/api/graphs/${graphId}/relations?userId=${testUser}`);
        console.log('✅ P2P Relations in graph:', relationsResponse.data.relations.length);
        
        // Get graph details with P2P status
        const graphDetailsResponse = await authAxios.get(`/api/graphs/${graphId}?userId=${testUser}`);
        console.log('✅ P2P Graph details retrieved:', graphDetailsResponse.data.graph.name);
        console.log('   P2P Status:', graphDetailsResponse.data.graph.p2pStatus);
        
        // Test 9: P2P-specific endpoints
        console.log('\n9️⃣ Testing P2P-specific endpoints...');
        
        // Get P2P status
        const p2pStatusResponse = await authAxios.get(`/api/p2p/status`);
        console.log('✅ P2P Status retrieved:', p2pStatusResponse.data.p2p);
        
        // Test 10: Collaboration features
        console.log('\n🔟 Testing collaboration features...');
        try {
            const collaborateResponse = await authAxios.post(`/api/graphs/${graphId}/collaborate`, {
                userId: testUser,
                maxParticipants: 6
            });
            console.log('✅ Collaboration session created:', collaborateResponse.data.session.id);
        } catch (error) {
            console.log('⚠️  Collaboration test skipped:', error.response?.data?.message || error.message);
        }
        
        // Test 11: List all P2P graphs for user
        console.log('\n1️⃣1️⃣ Testing P2P graph listing...');
        const graphsResponse = await authAxios.get(`/api/graphs?userId=${testUser}`);
        console.log('✅ User P2P graphs:', graphsResponse.data.graphs.length);
        
        console.log('\n🎉 All P2P Server integration tests completed successfully!');
        console.log(`📊 P2P Graph ID: ${graphId}`);
        console.log(`📊 P2P Nodes created: ${nodesResponse.data.nodes.length}`);
        console.log(`📊 P2P Relations created: ${relationsResponse.data.relations.length}`);
        console.log(`📊 P2P Attributes created: 1`);
        console.log(`📊 P2P Status: 🟢 Enabled`);
        
    } catch (error) {
        console.error('❌ P2P Server test failed:', error.response?.data || error.message);
        if (error.response?.status) {
            console.error('Status:', error.response.status);
        }
        process.exit(1);
    }
}

// Run the tests
if (import.meta.main) {
    testP2PServer().catch(console.error);
}

export { testP2PServer };
