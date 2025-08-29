import axios from 'axios';

console.log('🧪 Testing NodeBook Authentication Service...\n');

const AUTH_SERVICE_URL = 'http://localhost:3005';

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

// Test health check
async function testHealthCheck() {
    console.log('\n1️⃣ Testing Health Check...');
    
    await runTest('Authentication Service Health Check', async () => {
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/health`);
        if (response.data.status !== 'healthy') {
            throw new Error('Service is not healthy');
        }
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Version: ${response.data.version}`);
        console.log(`   Database: ${response.data.database}`);
    });
}

// Test user registration
async function testUserRegistration() {
    console.log('\n2️⃣ Testing User Registration...');
    
    const testUser = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'testpassword123'
    };
    
    await runTest('User Registration', async () => {
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/register`, testUser);
        if (!response.data.success) {
            throw new Error('User registration failed');
        }
        console.log(`   User registered: ${response.data.message}`);
        console.log(`   User ID: ${response.data.userId}`);
    });
}

// Test user login
async function testUserLogin() {
    console.log('\n3️⃣ Testing User Login...');
    
    const loginData = {
        username: 'testuser',
        password: 'testpassword123'
    };
    
    await runTest('User Login', async () => {
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, loginData);
        if (!response.data.success) {
            throw new Error('User login failed');
        }
        console.log(`   Login successful: ${response.data.user.username}`);
        console.log(`   Token received: ${response.data.token.substring(0, 20)}...`);
        return response.data.token;
    });
}

// Test JWT verification
async function testJWTVerification(token) {
    console.log('\n4️⃣ Testing JWT Verification...');
    
    await runTest('JWT Token Verification', async () => {
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/verify`, { token });
        if (!response.data.success) {
            throw new Error('JWT verification failed');
        }
        console.log(`   Token verified for user: ${response.data.user.username}`);
        console.log(`   User ID: ${response.data.user.id}`);
    });
}

// Test user profile
async function testUserProfile() {
    console.log('\n5️⃣ Testing User Profile...');
    
    await runTest('User Profile Retrieval', async () => {
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/auth/profile/testuser`);
        if (!response.data.success) {
            throw new Error('Profile retrieval failed');
        }
        console.log(`   Profile retrieved: ${response.data.user.username}`);
        console.log(`   Email: ${response.data.user.email}`);
        console.log(`   Admin: ${response.data.user.isAdmin}`);
    });
}

// Test password change
async function testPasswordChange() {
    console.log('\n6️⃣ Testing Password Change...');
    
    const passwordChangeData = {
        username: 'testuser',
        currentPassword: 'testpassword123',
        newPassword: 'newpassword456'
    };
    
    await runTest('Password Change', async () => {
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/change-password`, passwordChangeData);
        if (!response.data.success) {
            throw new Error('Password change failed');
        }
        console.log(`   Password changed: ${response.data.message}`);
    });
    
    // Test login with new password
    await runTest('Login with New Password', async () => {
        const loginData = {
            username: 'testuser',
            password: 'newpassword456'
        };
        
        const response = await axios.post(`${AUTH_SERVICE_URL}/api/auth/login`, loginData);
        if (!response.data.success) {
            throw new Error('Login with new password failed');
        }
        console.log(`   Login with new password successful`);
    });
}

// Test admin functionality
async function testAdminFunctionality() {
    console.log('\n7️⃣ Testing Admin Functionality...');
    
    await runTest('Admin Users List', async () => {
        const response = await axios.get(`${AUTH_SERVICE_URL}/api/admin/users`);
        if (!response.data.success) {
            throw new Error('Admin users list failed');
        }
        console.log(`   Users list retrieved: ${response.data.users.length} users`);
        response.data.users.forEach(user => {
            console.log(`     - ${user.username} (${user.isAdmin ? 'Admin' : 'User'})`);
        });
    });
}

// Main test execution
async function runAllTests() {
    try {
        console.log('🚀 Starting comprehensive authentication service tests...\n');
        
        await testHealthCheck();
        await testUserRegistration();
        const token = await testUserLogin();
        await testJWTVerification(token);
        await testUserProfile();
        await testPasswordChange();
        await testAdminFunctionality();
        
        // Test summary
        console.log('\n📊 Test Results Summary');
        console.log('========================');
        console.log(`✅ Passed: ${testResults.passed}`);
        console.log(`❌ Failed: ${testResults.failed}`);
        console.log(`📊 Total: ${testResults.total}`);
        console.log(`📈 Success Rate: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
        
        if (testResults.failed === 0) {
            console.log('\n🎉 All tests passed! Authentication service is working perfectly!');
        } else {
            console.log('\n⚠️  Some tests failed. Please check the service configuration.');
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
