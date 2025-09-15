#!/usr/bin/env node

const http = require('http');

const testEndpoints = [
  { method: 'GET', path: '/api/health', expectedStatus: 200, description: 'Health check' },
  { method: 'GET', path: '/api/graphs', expectedStatus: 200, description: 'Get graphs' },
  { method: 'GET', path: '/api/graphs/mock-graph-1/graph', expectedStatus: 200, description: 'Get graph data' },
  { method: 'GET', path: '/api/graphs/mock-graph-1/cnl', expectedStatus: 200, description: 'Get CNL' },
];

async function testIntegration() {
  const host = 'localhost';
  const port = 3000;

  console.log('🧪 Testing NestJS Backend Integration\n');

  for (const endpoint of testEndpoints) {
    const { method, path, expectedStatus, description } = endpoint;
    console.log(`Testing ${description} (${method} ${path})...`);

    const options = {
      hostname: host,
      port: port,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            resolve({ status: res.statusCode, data: data });
          });
        });

        req.on('error', (error) => {
          reject(error);
        });

        req.end();
      });

      console.log(`  Status: ${response.status}`);
      
      if (response.status === expectedStatus) {
        console.log(`  ✅ ${description} - SUCCESS`);
        try {
          const jsonData = JSON.parse(response.data);
          console.log(`  Response: ${JSON.stringify(jsonData).substring(0, 100)}...`);
        } catch (e) {
          console.log(`  Response: ${response.data.substring(0, 100)}...`);
        }
      } else {
        console.log(`  ❌ ${description} - FAILED (Expected ${expectedStatus}, got ${response.status})`);
        console.log(`  Response: ${response.data}`);
      }
    } catch (error) {
      console.log(`  ❌ ${description} - ERROR: ${error.message}`);
    }
    
    console.log('');
  }

  console.log('🎯 Integration Test Complete!');
}

testIntegration();
