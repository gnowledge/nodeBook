# NodeBook Hybrid Architecture

## 🎯 **Overview**

NodeBook now offers **two distinct server versions** to meet different user needs and institutional requirements:

- **SimpleGraph Version** - Traditional, centralized storage
- **P2P Version** - Distributed, encrypted, collaborative storage

## 🏗️ **Architecture Options**

### **Option 1: SimpleGraph (Traditional)**
```
📁 server-simple.js          # Traditional server
📁 simple-graph.js           # In-memory graph storage
📁 simple-graph-manager.js   # Graph lifecycle management
📁 test-simple-*.js          # SimpleGraph tests
```

**Best for:**
- ✅ **Institutions** requiring compliance and audit trails
- ✅ **Enterprises** needing centralized control
- ✅ **Users** preferring traditional, familiar systems
- ✅ **Environments** with strict security policies

**Features:**
- Centralized file-based storage
- SQLite authentication
- Standard HTTP API endpoints
- No P2P networking
- Full control over data location

### **Option 2: P2P Version (Advanced)**
```
📁 server-p2p.js             # P2P-enabled server
📁 p2p-graph.js              # Full P2P graph with pubsub
📁 p2p-graph-simple.js       # Simplified P2P graph
📁 p2p-graph-manager.js      # P2P graph lifecycle
📁 test-p2p-*.js             # P2P tests
```

**Best for:**
- ✅ **Researchers** needing collaboration
- ✅ **Teams** working on distributed projects
- ✅ **Users** wanting enhanced privacy
- ✅ **Advanced users** comfortable with P2P technology

**Features:**
- Distributed, encrypted storage
- Real-time collaboration
- Peer-to-peer networking
- Enhanced security with encryption
- Collaboration sessions

## 🚀 **How to Choose**

### **Choose SimpleGraph if:**
- You're in an **institutional environment**
- You need **compliance and audit trails**
- You prefer **centralized control**
- You're **uncomfortable with P2P technology**
- You need **predictable, traditional systems**

### **Choose P2P if:**
- You need **real-time collaboration**
- You want **enhanced privacy and security**
- You're working with **distributed teams**
- You're **comfortable with advanced technology**
- You want **peer-to-peer networking**

## 🔧 **Implementation Details**

### **API Compatibility**
Both versions provide **identical API endpoints**:
- `/api/graphs` - Graph management
- `/api/graphs/:id/nodes` - Node operations
- `/api/graphs/:id/relations` - Relation operations
- `/api/graphs/:id/attributes` - Attribute operations
- `/api/graphs/:id/functions` - Function operations

### **Data Storage**
- **SimpleGraph**: Local file system + SQLite
- **P2P**: Encrypted P2P storage + local caching

### **Authentication**
- **SimpleGraph**: SQLite-based authentication
- **P2P**: Same authentication + P2P session management

## 📋 **Migration Paths**

### **From SimpleGraph to P2P**
1. **Stop SimpleGraph server**: `Ctrl+C` on `server-simple.js`
2. **Start P2P server**: `node server-p2p.js`
3. **Frontend continues working** - no changes needed
4. **Data automatically encrypted** and distributed

### **From P2P to SimpleGraph**
1. **Stop P2P server**: `Ctrl+C` on `server-p2p.js`
2. **Start SimpleGraph server**: `node server-simple.js`
3. **Frontend continues working** - no changes needed
4. **Data remains accessible** in local storage

## 🧪 **Testing Both Versions**

### **Test SimpleGraph**
```bash
# Start SimpleGraph server
node server-simple.js

# Test SimpleGraph functionality
node test-simple-graph-core.js
node test-graph-api.js
```

### **Test P2P Version**
```bash
# Start P2P server
node server-p2p.js

# Test P2P functionality
node test-p2p-simple.js
node test-p2p-server.js
```

## 🔒 **Security Considerations**

### **SimpleGraph Security**
- **Data location**: Controlled by institution
- **Access control**: Standard authentication
- **Audit trails**: Full logging and monitoring
- **Compliance**: Meets institutional requirements

### **P2P Security**
- **Data encryption**: AES-256-GCM encryption
- **Distributed storage**: Data spread across network
- **Privacy**: Enhanced user privacy
- **Collaboration**: Secure real-time sharing

## 🌐 **Deployment Options**

### **Institutional Deployment**
```bash
# Use SimpleGraph for compliance
node server-simple.js

# Configure for institutional requirements
export NODE_ENV=production
export LOG_LEVEL=info
export AUDIT_ENABLED=true
```

### **Research/Team Deployment**
```bash
# Use P2P for collaboration
node server-p2p.js

# Configure for team collaboration
export NODE_ENV=production
export P2P_ENABLED=true
export COLLABORATION_ENABLED=true
```

## 📚 **File Reference**

### **Core Files (Both Versions)**
- `auth.js` - Authentication system
- `models.js` - Data models
- `cnl-parser.js` - CNL processing
- `schema-manager.js` - Schema management

### **SimpleGraph Files**
- `server-simple.js` - SimpleGraph server
- `simple-graph.js` - SimpleGraph implementation
- `simple-graph-manager.js` - SimpleGraph management

### **P2P Files**
- `server-p2p.js` - P2P server
- `p2p-graph.js` - Full P2P implementation
- `p2p-graph-simple.js` - Simplified P2P
- `p2p-graph-manager.js` - P2P management

## 🎉 **Benefits of Hybrid Approach**

### **For Users**
- ✅ **Choice** based on needs and comfort level
- ✅ **Familiarity** with traditional systems
- ✅ **Advanced features** when ready
- ✅ **No lock-in** to single approach

### **For Institutions**
- ✅ **Compliance** with traditional systems
- ✅ **Control** over data and infrastructure
- ✅ **Familiarity** for IT staff
- ✅ **Migration path** to advanced features

### **For Developers**
- ✅ **Code reuse** between versions
- ✅ **API consistency** across versions
- ✅ **Flexible deployment** options
- ✅ **Future-proof** architecture

## 🚀 **Next Steps**

1. **Choose your preferred version** based on needs
2. **Test both versions** to understand differences
3. **Deploy the version** that fits your environment
4. **Migrate between versions** as needs change

**The hybrid approach gives you the best of both worlds: traditional reliability and advanced P2P capabilities!**
