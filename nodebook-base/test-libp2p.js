#!/usr/bin/env node

/**
 * Test script to verify libp2p integration
 * This tests the basic functionality of libp2p with ES modules
 */

import { createLibp2p } from 'libp2p';
import { tcp } from '@libp2p/tcp';

async function testLibp2p() {
  console.log('🧪 Testing libp2p integration...');
  
  try {
    // Create a basic libp2p instance
    const libp2p = await createLibp2p({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [tcp()],
      connectionManager: {
        minConnections: 0
      }
    });
    
    console.log('✅ libp2p instance created successfully');
    console.log('📊 Instance type:', typeof libp2p);
    console.log('🆔 Peer ID:', libp2p.peerId.toString());
    console.log('🌐 Multiaddrs:', libp2p.getMultiaddrs().map(ma => ma.toString()));
    
    // Start the node
    await libp2p.start();
    console.log('🚀 libp2p node started successfully');
    
    // Stop the node
    await libp2p.stop();
    console.log('🛑 libp2p node stopped successfully');
    
    console.log('🎉 libp2p integration test passed!');
    
  } catch (error) {
    console.error('❌ libp2p test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the test
testLibp2p().catch(console.error);
