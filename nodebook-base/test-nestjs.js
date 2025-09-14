#!/usr/bin/env node

const http = require('http');

const testEndpoints = [
  { method: 'GET', path: '/api/health', expectedStatus: 200 },
  { method: 'GET', path: '/api/docs', expectedStatus: 200 },
  { method: 'GET', path: '/', expectedStatus: 200 },
];

async function testEndpoint(host, port, endpoint) {
  return new Promise((resolve) => {
    const options = {
      hostname: host,
      port: port,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          endpoint: `${endpoint.method} ${endpoint.path}`,
          status: res.statusCode,
          expected: endpoint.expectedStatus,
          success: res.statusCode === endpoint.expectedStatus,
          data: data.substring(0, 100) + (data.length > 100 ? '...' : ''),
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        status: 'ERROR',
        expected: endpoint.expectedStatus,
        success: false,
        error: err.message,
      });
    });

    req.end();
  });
}

async function runTests() {
  const host = process.env.HOST || 'localhost';
  const port = process.env.PORT || 3000;
  
  console.log(`🧪 Testing NodeBook NestJS Backend at ${host}:${port}`);
  console.log('=' .repeat(50));

  const results = [];
  
  for (const endpoint of testEndpoints) {
    const result = await testEndpoint(host, port, endpoint);
    results.push(result);
    
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.endpoint} - Status: ${result.status} (Expected: ${result.expected})`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    } else if (result.data) {
      console.log(`   Response: ${result.data}`);
    }
  }

  console.log('=' .repeat(50));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`📊 Test Results: ${successCount}/${totalCount} passed`);
  
  if (successCount === totalCount) {
    console.log('🎉 All tests passed! NestJS backend is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the server logs for details.');
    process.exit(1);
  }
}

runTests().catch(console.error);
