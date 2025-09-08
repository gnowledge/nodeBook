#!/usr/bin/env node

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = 4444;

// Create HTTP server with basic health endpoint
const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', rooms: rooms.size }));
    return;
  }
  // Default
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('NodeBook signaling server');
});

// Create WebSocket server
const wss = new WebSocketServer({ 
  server,
  path: '/'
});

console.log(`🚀 Y.js Signaling Server starting on port ${PORT}`);

// Store rooms and their connections
const rooms = new Map();

wss.on('connection', (ws, req) => {
  console.log('📡 New WebSocket connection');
  
  let roomName = null;
  let clientId = null;

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join':
          roomName = message.room;
          clientId = message.clientId || Math.random().toString(36).substr(2, 9);
          
          if (!rooms.has(roomName)) {
            rooms.set(roomName, new Set());
          }
          
          rooms.get(roomName).add(ws);
          console.log(`👤 Client ${clientId} joined room: ${roomName}`);
          
          // Notify other clients in the room
          rooms.get(roomName).forEach(client => {
            if (client !== ws && client.readyState === 1) {
              client.send(JSON.stringify({
                type: 'peer-joined',
                clientId: clientId
              }));
            }
          });
          
          // Send list of existing peers to the new client
          const existingPeers = Array.from(rooms.get(roomName))
            .filter(client => client !== ws && client.readyState === 1)
            .map(client => client.clientId || 'unknown');
          
          if (existingPeers.length > 0) {
            ws.send(JSON.stringify({
              type: 'peers',
              peers: existingPeers
            }));
          }
          break;
          
        case 'signal':
          // Forward signaling messages to other clients in the room
          if (roomName && rooms.has(roomName)) {
            rooms.get(roomName).forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'signal',
                  from: clientId,
                  to: message.to,
                  signal: message.signal
                }));
              }
            });
          }
          break;
          
        case 'leave':
          if (roomName && rooms.has(roomName)) {
            rooms.get(roomName).delete(ws);
            
            // Notify other clients
            rooms.get(roomName).forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'peer-left',
                  clientId: clientId
                }));
              }
            });
            
            // Clean up empty rooms
            if (rooms.get(roomName).size === 0) {
              rooms.delete(roomName);
              console.log(`🗑️ Room ${roomName} deleted (empty)`);
            }
          }
          break;
      }
    } catch (error) {
      console.error('❌ Error parsing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('👋 WebSocket connection closed');
    
    if (roomName && rooms.has(roomName)) {
      rooms.get(roomName).delete(ws);
      
      // Notify other clients
      rooms.get(roomName).forEach(client => {
        if (client !== ws && client.readyState === 1) {
          client.send(JSON.stringify({
            type: 'peer-left',
            clientId: clientId
          }));
        }
      });
      
      // Clean up empty rooms
      if (rooms.get(roomName).size === 0) {
        rooms.delete(roomName);
        console.log(`🗑️ Room ${roomName} deleted (empty)`);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

server.listen(PORT, () => {
  console.log(`✅ Y.js Signaling Server running on ws://localhost:${PORT}`);
  console.log(`📊 Active rooms: ${rooms.size}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down signaling server...');
  server.close(() => {
    console.log('✅ Signaling server stopped');
    process.exit(0);
  });
});

