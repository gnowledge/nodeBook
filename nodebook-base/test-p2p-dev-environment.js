import axios from 'axios';

console.log('🧪 Testing NodeBook P2P Development Environment...\n');

// Service endpoints
const SERVICES = {
    p2pServer: 'http://localhost:3000',
    nlpService: 'http://localhost:3001',
    wordnetService: 'http://localhost:3002',
    p2pMonitor: 'http://localhost:3003',
    frontend: 'http://localhost:8080'
};

// Test results
const testResults = {
    passed: 0,
    failed: 0,
    total: 0
};

// Helper function to run tests
async function runTest(testName, testFunction) {
    testResults.total++;
    try {
        await testFunction();
        console.log(`✅ ${testName} - PASSED`);
        testResults.passed++;
    } catch (error) {
        console.log(`❌ ${testName} - FAILED`);
        console.log(`   Error: ${error.message}`);
        testResults.failed++;
    }
}

// Test P2P Server
async function testP2PServer() {
    console.log('\n1️⃣ Testing P2P Server...');
    
    // Health check
    await runTest('P2P Server Health Check', async () => {
        const response = await axios.get(`${SERVICES.p2pServer}/api/health`);
        if (response.data.version !== 'P2P-Enabled') {
            throw new Error('Server is not P2P-enabled');
        }
        console.log(`   Version: ${response.data.version}`);
        console.log(`   P2P Status: ${JSON.stringify(response.data.p2p)}`);
    });
    
    // Authentication
    await runTest('P2P Server Authentication', async () => {
        const response = await axios.post(`${SERVICES.p2pServer}/api/auth/login`, {
            username: 'admin',
            password: '.osok466cfpk.d84q1ofmttk'
        });
        if (!response.data.token) {
            throw new Error('No authentication token received');
        }
        console.log(`   Token received: ${response.data.token.substring(0, 20)}...`);
        return response.data.token;
    });
    
    // Graph creation
    await runTest('P2P Graph Creation', async () => {
        const token = await getAuthToken();
        const response = await axios.post(`${SERVICES.p2pServer}/api/graphs`, {
            name: 'Test P2P Graph',
            userId: 'admin'
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.data.graph.p2pEnabled) {
            throw new Error('Graph is not P2P-enabled');
        }
        console.log(`   P2P Graph created: ${response.data.graph.id}`);
        return response.data.graph.id;
    });
}

// Test NLP Service
async function testNLPService() {
    console.log('\n2️⃣ Testing NLP Service...');
    
    // Health check
    await runTest('NLP Service Health Check', async () => {
        const response = await axios.get(`${SERVICES.nlpService}/api/health`);
        if (response.status !== 200) {
            throw new Error('NLP service not responding');
        }
        console.log(`   Status: ${response.data.status || 'OK'}`);
    });
    
    // CNL Processing
    await runTest('CNL Processing', async () => {
        const response = await axios.post(`${SERVICES.nlpService}/api/process`, {
            text: 'Create a concept node called "Test Concept"'
        });
        if (!response.data.result) {
            throw new Error('CNL processing failed');
        }
        console.log(`   CNL processed: ${response.data.result.type}`);
    });
}

// Test WordNet Service
async function testWordNetService() {
    console.log('\n3️⃣ Testing WordNet Service...');
    
    // Health check
    await runTest('WordNet Service Health Check', async () => {
        const response = await axios.get(`${SERVICES.wordnetService}/api/health`);
        if (response.status !== 200) {
            throw new Error('WordNet service not responding');
        }
        console.log(`   Status: ${response.data.status || 'OK'}`);
    });
    
    // Word lookup
    await runTest('WordNet Word Lookup', async () => {
        const response = await axios.get(`${SERVICES.wordnetService}/api/lookup/concept`);
        if (!response.data.definitions || response.data.definitions.length === 0) {
            throw new Error('WordNet lookup failed');
        }
        console.log(`   Word found: ${response.data.word}`);
    });
}

// Test P2P Monitor
async function testP2PMonitor() {
    console.log('\n4️⃣ Testing P2P Network Monitor...');
    
    // Health check
    await runTest('P2P Monitor Health Check', async () => {
        const response = await axios.get(`${SERVICES.p2pMonitor}/api/health`);
        if (response.status !== 200) {
            throw new Error('P2P monitor not responding');
        }
        console.log(`   Status: ${response.data.status}`);
    });
    
    // Network status
    await runTest('P2P Network Status', async () => {
        const response = await axios.get(`${SERVICES.p2pMonitor}/api/p2p/network/status`);
        if (!response.data.network) {
            throw new Error('Network status not available');
        }
        console.log(`   Network ID: ${response.data.network.networkId}`);
    });
    
    // Active peers
    await runTest('P2P Active Peers', async () => {
        const response = await axios.get(`${SERVICES.p2pMonitor}/api/p2p/network/peers`);
        if (!response.data.peers) {
            throw new Error('Peer information not available');
        }
        console.log(`   Active peers: ${response.data.count}`);
    });
    
    // Network metrics
    await runTest('P2P Network Metrics', async () => {
        const response = await axios.get(`${SERVICES.p2pMonitor}/api/p2p/network/metrics`);
        if (!response.data.metrics) {
            throw new Error('Network metrics not available');
        }
        console.log(`   Total peers: ${response.data.metrics.totalPeers}`);
        console.log(`   Active graphs: ${response.data.metrics.totalGraphs}`);
    });
}

// Test Frontend (if available)
async function testFrontend() {
    console.log('\n5️⃣ Testing Frontend...');
    
    try {
        const response = await axios.get(SERVICES.frontend);
        await runTest('Frontend Accessibility', async () => {
            if (response.status !== 200) {
                throw new Error('Frontend not accessible');
            }
            console.log(`   Status: ${response.status}`);
        });
    } catch (error) {
        console.log('⚠️  Frontend not available (skipping)');
        console.log(`   Error: ${error.message}`);
    }
}

// Test P2P Integration
async function testP2PIntegration() {
    console.log('\n6️⃣ Testing P2P Integration...');
    
    const token = await getAuthToken();
    const graphId = await createTestGraph(token);
    
    // Test P2P node creation
    await runTest('P2P Node Creation', async () => {
        const response = await axios.post(`${SERVICES.p2pServer}/api/graphs/${graphId}/nodes`, {
            base_name: 'P2P Test Node',
            userId: 'admin',
            options: { description: 'Testing P2P integration' }
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.data.nodeId) {
            throw new Error('P2P node creation failed');
        }
        console.log(`   P2P Node created: ${response.data.nodeId}`);
    });
    
    // Test P2P collaboration
    await runTest('P2P Collaboration Session', async () => {
        const response = await axios.post(`${SERVICES.p2pServer}/api/graphs/${graphId}/collaborate`, {
            userId: 'admin',
            maxParticipants: 6
        }, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.data.session) {
            throw new Error('Collaboration session creation failed');
        }
        console.log(`   Collaboration session: ${response.data.session.id}`);
    });
}

// Helper functions
let authToken = null;

async function getAuthToken() {
    if (!authToken) {
        const response = await axios.post(`${SERVICES.p2pServer}/api/auth/login`, {
            username: 'admin',
            password: '.osok466cfpk.d84q1ofmttk'
        });
        authToken = response.data.token;
    }
    return authToken;
}

async function createTestGraph(token) {
    const response = await axios.post(`${SERVICES.p2pServer}/api/graphs`, {
        name: 'P2P Integration Test Graph',
        userId: 'admin'
    }, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data.graph.id;
}

// Main test execution
async function runAllTests() {
    try {
        console.log('🚀 Starting comprehensive P2P development environment tests...\n');
        
        await testP2PServer();
        await testNLPService();
        await testWordNetService();
        await testP2PMonitor();
        await testFrontend();
        await testP2PIntegration();
        
        // Test summary
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📊 Total: ${testResults.total}`);
        console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
        
        if (testResults.failed === 0) {
            console.log('\n🎉 All tests passed! P2P development environment is working perfectly!');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the service configurations.');
        }
        
    } catch (error) {
        console.error('❌ Test execution failed:', error.message);
        process.exit(1);
    }
}

// Run tests if this file is executed directly
if (import.meta.main) {
    runAllTests().catch(console.error);
}

export { runAllTests, testResults };
