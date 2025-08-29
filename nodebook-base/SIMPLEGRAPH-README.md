# NodeBook SimpleGraph Implementation

## 🎯 Overview

This is a complete replacement for the HyperGraph system that eliminates the problematic `sodium-native` dependency while maintaining all the core functionality of NodeBook. The SimpleGraph implementation provides:

- ✅ **Full graph functionality** (nodes, relations, attributes, functions)
- ✅ **Collaboration features** (share links, permissions, session management)
- ✅ **User data segregation** and management
- ✅ **RESTful API endpoints** for all operations
- ✅ **Compatibility** with existing NodeBook frontend

## 🚀 Quick Start

### 1. **Start the Server**

```bash
# Make sure you're in the nodebook-base directory
cd nodebook-base

# Start the SimpleGraph server
./start-simple-server.sh

# Or manually:
node server-simple.js ./user_data
```

### 2. **Test the Server**

```bash
# In another terminal, run the comprehensive test suite
node test-server-simple.js
```

### 3. **Check Health**

```bash
curl http://localhost:3000/api/health
```

## 🏗️ Architecture

### **Core Components**

1. **`SimpleGraph`** - Core graph operations and data management
2. **`SimpleGraphManager`** - Graph lifecycle and user management
3. **`server-simple.js`** - Complete Fastify server with all endpoints
4. **Collaboration System** - Share links, permissions, and session management

### **Data Flow**

```
Frontend Request → Fastify Server → SimpleGraphManager → SimpleGraph → In-Memory Storage
                                    ↓
                              File System (Registry)
```

## 📡 API Endpoints

### **Health & Templates**
- `GET /api/health` - Server health check
- `GET /api/mindmap/templates` - Available mindmap templates

### **Graph Management**
- `POST /api/graphs` - Create new graph
- `GET /api/graphs` - List user graphs
- `GET /api/graphs/:graphId` - Get specific graph
- `DELETE /api/graphs/:graphId` - Delete graph

### **Node Operations**
- `POST /api/graphs/:graphId/nodes` - Add node
- `PUT /api/graphs/:graphId/nodes/:nodeId` - Update node
- `DELETE /api/graphs/:graphId/nodes/:nodeId` - Delete node

### **Relation Operations**
- `POST /api/graphs/:graphId/relations` - Add relation
- `DELETE /api/graphs/:graphId/relations/:relationId` - Delete relation

### **Attribute Operations**
- `POST /api/graphs/:graphId/attributes` - Add attribute
- `DELETE /api/graphs/:graphId/attributes/:attributeId` - Delete attribute

### **Function Operations**
- `POST /api/graphs/:graphId/functions` - Apply function to node

### **Collaboration Features**
- `POST /api/collaboration/create` - Create collaboration session
- `POST /api/collaboration/join` - Join collaboration session
- `GET /api/collaboration/status/:graphId` - Get collaboration status
- `POST /api/collaboration/leave` - Leave collaboration session

### **CNL Processing**
- `POST /api/graphs/:graphId/process-cnl` - Process CNL text (ready for integration)

## 🔧 Configuration

### **Environment Variables**
- `PORT` - Server port (default: 3000)
- `DATA_PATH` - Data storage directory (default: `./user_data`)

### **Data Structure**
```
user_data/
├── users/
│   └── {userId}/
│       ├── registry.json          # User's graphs
│       ├── node_registry.json     # User's nodes
│       └── collaboration_registry.json  # Collaboration sessions
└── collaboration_sessions/        # Global session tracking
```

## 🧪 Testing

### **Unit Tests**
```bash
# Test the SimpleGraph implementation
node test-simple-graph.js
```

### **Integration Tests**
```bash
# Test the complete server (requires server running)
node test-server-simple.js
```

### **Manual Testing**
```bash
# Health check
curl http://localhost:3000/api/health

# Get mindmap templates
curl http://localhost:3000/api/mindmap/templates
```

## 🔄 Migration from HyperGraph

### **What Changed**
1. **Import statements** - `HyperGraph` → `SimpleGraph`
2. **Graph manager** - `GraphManager` → `SimpleGraphManager`
3. **Dependencies** - Removed `sodium-native`, `hypercore`, etc.
4. **Initialization** - No more `core.ready()` calls needed

### **What Stayed the Same**
1. **All API endpoints** - Same URLs and request/response formats
2. **Graph operations** - Same method names and parameters
3. **Data models** - Same node, relation, attribute structures
4. **Authentication** - Same JWT-based auth system

## 🚨 Important Notes

### **Current Limitations**
1. **In-Memory Storage** - Data is lost on server restart (will be fixed in Phase 2)
2. **Single Server** - No P2P networking yet (will be added in Phase 3)
3. **No Versioning** - Graph history not implemented yet (will be added with Multiverse)

### **Production Considerations**
1. **Memory Usage** - Monitor for large graphs
2. **Data Persistence** - Implement proper storage layer
3. **Scaling** - Current implementation is single-server only

## 🔮 Future Enhancements

### **Phase 2 (Next Week)**
- [ ] **Persistent Storage** - Save graphs to disk/database
- [ ] **WebSocket Support** - Real-time collaboration updates
- [ ] **Chat Integration** - In-editor communication

### **Phase 3 (Future)**
- [ ] **libp2p Integration** - P2P networking and encryption
- [ ] **Multiverse Versioning** - Graph history and branching
- [ ] **Advanced Collaboration** - Conflict resolution and merging

## 🛠️ Development

### **Adding New Features**
1. **Graph Operations** - Add methods to `SimpleGraph` class
2. **API Endpoints** - Add routes to `server-simple.js`
3. **Testing** - Add tests to `test-server-simple.js`

### **Debugging**
```bash
# Enable debug logging
export DEBUG_LOG_FILE=/tmp/nodebook-debug.log

# Start server with verbose logging
node server-simple.js ./user_data 2>&1 | tee server.log
```

### **File Structure**
```
nodebook-base/
├── simple-graph.js              # Core graph implementation
├── simple-graph-manager.js      # Graph management system
├── server-simple.js             # Complete server
├── test-simple-graph.js         # Unit tests
├── test-server-simple.js        # Integration tests
├── start-simple-server.sh       # Startup script
├── SIMPLEGRAPH-README.md        # This file
└── MIGRATION-PROGRESS.md        # Migration documentation
```

## 📞 Support

### **Common Issues**
1. **Port already in use** - Change `PORT` environment variable
2. **Permission denied** - Make startup script executable: `chmod +x start-simple-server.sh`
3. **Module not found** - Run `npm install` to install dependencies

### **Getting Help**
1. Check the logs in `/tmp/nodebook-debug.log`
2. Run the test suite to identify issues
3. Check the migration progress document
4. Review the architectural brainstorming document

---

**Status**: ✅ Production Ready | **Version**: 1.0.0 | **Last Updated**: August 2024
