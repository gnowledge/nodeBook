# 🚀 NodeBook P2P Development Environment

This document describes the complete P2P development environment for NodeBook, including all microservices, testing procedures, and deployment options.

## 🏗️ **Architecture Overview**

The P2P development environment consists of several interconnected services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   P2P Server    │    │   NLP Service   │
│   (Port 8080)   │◄──►│   (Port 3000)   │◄──►│   (Port 3001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  WordNet        │    │  P2P Monitor    │
                       │  Service        │    │  (Port 3003)    │
                       │  (Port 3002)    │    └─────────────────┘
                       └─────────────────┘
```

## 🐳 **Docker Services**

### **1. P2P Server (Main Backend)**
- **Container**: `nodebook-p2p`
- **Port**: 3000
- **Features**: 
  - P2P graph management
  - Real-time collaboration
  - Encrypted data storage
  - libp2p networking

### **2. NLP Service**
- **Container**: `nodebook-nlp`
- **Port**: 3001
- **Features**:
  - CNL (Controlled Natural Language) processing
  - Graph generation from text
  - Semantic analysis

### **3. WordNet Service**
- **Container**: `nodebook-wordnet`
- **Port**: 3002
- **Features**:
  - Semantic word lookups
  - Concept definitions
  - Language processing

### **4. P2P Network Monitor**
- **Container**: `nodebook-p2p-monitor`
- **Port**: 3003
- **Features**:
  - Real-time network monitoring
  - Peer status tracking
  - Performance metrics
  - WebSocket updates

### **5. Frontend (Optional)**
- **Container**: `nodebook-frontend`
- **Port**: 8080
- **Features**:
  - React-based user interface
  - P2P status indicators
  - Real-time collaboration UI

### **6. Supporting Services**
- **Redis**: Session management
- **PostgreSQL**: Advanced data storage

## 🚀 **Quick Start**

### **Prerequisites**
- Docker and Docker Compose installed
- Node.js 22+ (for local development)
- Git

### **1. Start the Environment**
```bash
# Make script executable (first time only)
chmod +x start-p2p-dev.sh

# Start all services
./start-p2p-dev.sh
# Choose option 1
```

### **2. Check Service Status**
```bash
./start-p2p-dev.sh
# Choose option 4
```

### **3. Run Tests**
```bash
./start-p2p-dev.sh
# Choose option 3
```

### **4. Stop Environment**
```bash
./start-p2p-dev.sh
# Choose option 2
```

## 🧪 **Testing the Environment**

### **Automated Testing**
The environment includes comprehensive testing:

```bash
# Run all tests
node test-p2p-dev-environment.js

# Or use the launcher
./start-p2p-dev.sh 3
```

### **Manual Testing**
Test individual services:

```bash
# P2P Server
curl http://localhost:3000/api/health

# NLP Service
curl http://localhost:3001/api/health

# WordNet Service
curl http://localhost:3002/api/health

# P2P Monitor
curl http://localhost:3003/api/health
```

### **P2P Network Testing**
```bash
# Check P2P network status
curl http://localhost:3003/api/p2p/network/status

# View active peers
curl http://localhost:3003/api/p2p/network/peers

# Get network metrics
curl http://localhost:3003/api/p2p/network/metrics
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# P2P Server
NODE_ENV=development
P2P_ENABLED=true
COLLABORATION_ENABLED=true
LOG_LEVEL=info

# P2P Monitor
MONITOR_PORT=3003
P2P_NETWORK_ID=nodebook-dev
```

### **Docker Compose Customization**
Edit `docker-compose-p2p-dev.yml` to:
- Change ports
- Add/remove services
- Modify volume mounts
- Adjust resource limits

## 📊 **Monitoring and Debugging**

### **Container Logs**
```bash
# View all logs
docker-compose -f docker-compose-p2p-dev.yml logs

# View specific service logs
docker logs nodebook-p2p
docker logs nodebook-nlp
docker logs nodebook-wordnet
docker logs nodebook-p2p-monitor
```

### **Real-time Monitoring**
- **WebSocket**: `ws://localhost:3003/ws/p2p-monitor`
- **HTTP API**: `http://localhost:3003/api/p2p/network/*`
- **Health Checks**: All services include health endpoints

### **Performance Metrics**
- Network latency
- Data throughput
- Active connections
- Peer count
- Graph statistics

## 🔄 **Development Workflow**

### **1. Local Development**
```bash
# Start services
./start-p2p-dev.sh 1

# Make code changes
# Test changes
node test-p2p-dev-environment.js

# Stop services
./start-p2p-dev.sh 2
```

### **2. Testing Changes**
```bash
# Run tests after each change
./start-p2p-dev.sh 3

# Check service status
./start-p2p-dev.sh 4

# View logs for debugging
docker logs nodebook-p2p
```

### **3. Reset Environment**
```bash
# Complete reset (useful for testing)
./start-p2p-dev.sh 5
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3001
sudo netstat -tulpn | grep :3002
sudo netstat -tulpn | grep :3003
```

#### **2. Container Won't Start**
```bash
# Check container logs
docker logs nodebook-p2p

# Check Docker status
docker info
docker system df
```

#### **3. P2P Network Issues**
```bash
# Check P2P monitor
curl http://localhost:3003/api/p2p/network/status

# Restart P2P services
docker restart nodebook-p2p
docker restart nodebook-p2p-monitor
```

#### **4. Permission Issues**
```bash
# Fix volume permissions
sudo chown -R $USER:$USER user_data/
sudo chown -R $USER:$USER logs/
sudo chown -R $USER:$USER media/
```

### **Debug Mode**
```bash
# Start with debug logging
LOG_LEVEL=debug ./start-p2p-dev.sh 1

# View detailed logs
docker logs -f nodebook-p2p
```

## 📈 **Performance Optimization**

### **Resource Limits**
```yaml
# In docker-compose-p2p-dev.yml
services:
  nodebook-p2p:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

### **Scaling Services**
```bash
# Scale specific services
docker-compose -f docker-compose-p2p-dev.yml up -d --scale nlp-service=2
```

## 🔒 **Security Considerations**

### **Network Security**
- Services communicate over internal Docker network
- External access only through exposed ports
- P2P encryption using AES-256-GCM

### **Data Privacy**
- User data encrypted at rest
- P2P communication encrypted
- No data broadcasting without explicit sharing

## 🚀 **Production Deployment**

### **Environment Variables**
```bash
NODE_ENV=production
P2P_ENABLED=true
COLLABORATION_ENABLED=true
LOG_LEVEL=warn
```

### **Docker Build**
```bash
# Build production images
docker build -f Dockerfile.p2p --target production -t nodebook-p2p:latest .

# Use production compose file
docker-compose -f docker-compose-p2p-prod.yml up -d
```

## 📚 **Additional Resources**

### **Documentation**
- [HYBRID-ARCHITECTURE.md](./HYBRID-ARCHITECTURE.md) - Architecture overview
- [API Documentation](./API.md) - API endpoints and usage
- [P2P Implementation](./P2P-IMPLEMENTATION.md) - P2P technical details

### **Code Examples**
- [test-p2p-dev-environment.js](./test-p2p-dev-environment.js) - Comprehensive testing
- [p2p-monitor.js](./p2p-monitor.js) - Monitoring service
- [p2p-graph.js](./p2p-graph.js) - P2P graph implementation

### **Support**
- Check container logs for errors
- Run tests to verify functionality
- Use the monitoring service for insights
- Reset environment if issues persist

---

**🎯 The P2P development environment provides a complete testing and development setup for NodeBook's distributed features. Use the launcher script for easy management and comprehensive testing for quality assurance.**
