# 🚀 NodeBook P2P Development Setup

This document explains how to set up and run the P2P development environment for NodeBook from the project root.

## 🏗️ **Architecture Overview**

The P2P development environment is now organized at the project root level, integrating with existing microservices:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   P2P Server    │    │   Media Backend │
│   (Port 5173)   │◄──►│   (Port 3000)   │◄──►│   (Port 3001)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │  NLP Service    │    │  P2P Monitor    │
                       │  (Port 3002)    │    │  (Port 3004)    │
                       └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │  WordNet       │
                       │  Service       │
                       │  (Port 3003)   │
                       └─────────────────┘
```

## 🐳 **Docker Services**

### **Core P2P Services (Always Available)**
- **P2P Server**: `nodebook-p2p` on port 3000
- **P2P Monitor**: `p2p-monitor` on port 3004  
- **Keycloak**: `keycloak` on port 8080

### **External Microservices (Conditional)**
- **Media Backend**: `media-backend` on port 3001
- **NLP Service**: `nlp-service` on port 3002
- **WordNet Service**: `wordnet-service` on port 3003
- **Frontend**: `frontend` on port 5173

## 🚀 **Quick Start**

### **Prerequisites**
- Docker and Docker Compose installed
- Node.js 22+ (for local development)
- Git

### **1. Start Core P2P Environment**
```bash
# Make script executable (first time only)
chmod +x start-p2p-dev.sh

# Start core P2P services
./start-p2p-dev.sh
# Choose option 1
```

### **2. Start Full Environment (Optional)**
```bash
# Start all services including external microservices
./start-p2p-dev.sh
# Choose option 2
```

### **3. Check Status**
```bash
# View running containers
./start-p2p-dev.sh
# Choose option 5
```

### **4. Run Tests**
```bash
# Test the environment
./start-p2p-dev.sh
# Choose option 4
```

### **5. Stop Environment**
```bash
# Stop all services
./start-p2p-dev.sh
# Choose option 3
```

## 📁 **File Structure**

```
nodeBook/                          # Project root
├── docker-compose-p2p-core.yml   # Core P2P services only
├── docker-compose-p2p-dev.yml    # Full P2P environment
├── start-p2p-dev.sh              # Environment management script
├── P2P-DEVELOPMENT-SETUP.md      # This file
├── nodebook-base/                 # P2P backend implementation
│   ├── Dockerfile.p2p            # P2P server container
│   ├── Dockerfile.p2p-monitor    # P2P monitor container
│   ├── server-p2p.js             # P2P server implementation
│   ├── p2p-monitor.js            # P2P monitoring service
│   └── test-p2p-dev-environment.js # Testing suite
├── nlp-service/                   # NLP microservice
├── wordnet-service/               # WordNet microservice
├── media-backend/                 # Media handling service
└── frontend/                      # React frontend
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

### **Port Mapping**
- **3000**: P2P Server (main backend)
- **3001**: Media Backend
- **3002**: NLP Service
- **3003**: WordNet Service
- **3004**: P2P Monitor
- **5173**: Frontend (Vite dev server)
- **6379**: Redis

## 🧪 **Testing**

### **Automated Testing**
```bash
# Run comprehensive tests
./start-p2p-dev.sh 4

# Or manually
cd nodebook-base && node test-p2p-dev-environment.js
```

### **Manual Testing**
```bash
# Test P2P Server
curl http://localhost:3000/api/health

# Test P2P Monitor
curl http://localhost:3004/api/health

# Test Redis
docker exec nodebook-redis-p2p-core-dev redis-cli ping
```

## 📊 **Monitoring and Debugging**

### **Container Logs**
```bash
# View all logs
docker compose -f docker-compose-p2p-core.yml logs

# View specific service logs
docker logs nodebook-p2p-core-dev
docker logs nodebook-p2p-monitor-core-dev
docker logs nodebook-redis-p2p-core-dev
```

### **Real-time Monitoring**
- **P2P Monitor**: `http://localhost:3004`
- **WebSocket**: `ws://localhost:3004/ws/p2p-monitor`
- **API Endpoints**: `http://localhost:3004/api/p2p/network/*`

## 🔄 **Development Workflow**

### **1. Core Development**
```bash
# Start core environment
./start-p2p-dev.sh 1

# Make code changes in nodebook-base/
# Test changes
./start-p2p-dev.sh 4

# Stop environment
./start-p2p-dev.sh 3
```

### **2. Full Integration Testing**
```bash
# Start full environment
./start-p2p-dev.sh 2

# Test with all microservices
./start-p2p-dev.sh 4

# Stop environment
./start-p2p-dev.sh 3
```

### **3. Reset Environment**
```bash
# Complete reset
./start-p2p-dev.sh 6
```

## 🚨 **Troubleshooting**

### **Common Issues**

#### **1. Port Conflicts**
```bash
# Check what's using the ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :3004
```

#### **2. Container Won't Start**
```bash
# Check container logs
docker logs nodebook-p2p-core-dev

# Check Docker status
docker info
docker system df
```

#### **3. P2P Network Issues**
```bash
# Check P2P monitor
curl http://localhost:3004/api/p2p/network/status

# Restart P2P services
docker restart nodebook-p2p-core-dev
docker restart nodebook-p2p-monitor-core-dev
```

### **Debug Mode**
```bash
# Start with debug logging
LOG_LEVEL=debug ./start-p2p-dev.sh 1

# View detailed logs
docker logs -f nodebook-p2p-core-dev
```

## 🔒 **Security Considerations**

### **Data Storage**
- **SQLite**: User authentication (as requested)
- **File-based**: Graph data and media files
- **Redis**: Session management and P2P coordination

### **Network Security**
- Services communicate over internal Docker network
- External access only through exposed ports
- P2P encryption using AES-256-GCM

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
docker build -f nodebook-base/Dockerfile.p2p --target production -t nodebook-p2p:latest ./nodebook-base

# Use production compose file
docker compose -f docker-compose-p2p-prod.yml up -d
```

## 📚 **Additional Resources**

### **Documentation**
- [HYBRID-ARCHITECTURE.md](./nodebook-base/HYBRID-ARCHITECTURE.md) - Architecture overview
- [P2P-DEV-ENVIRONMENT.md](./nodebook-base/P2P-DEV-ENVIRONMENT.md) - Detailed P2P setup
- [API Documentation](./nodebook-base/API.md) - API endpoints and usage

### **Code Examples**
- [test-p2p-dev-environment.js](./nodebook-base/test-p2p-dev-environment.js) - Testing suite
- [p2p-monitor.js](./nodebook-base/p2p-monitor.js) - Monitoring service
- [server-p2p.js](./nodebook-base/server-p2p.js) - P2P server implementation

---

**🎯 The P2P development environment is now properly organized at the project root level, integrating seamlessly with existing microservices while maintaining the flexibility to run core P2P services independently.**

**Key Benefits:**
- **Centralized management** from project root
- **Microservice integration** with existing services
- **Flexible deployment** (core vs. full)
- **SQLite for users** (as requested)
- **No PostgreSQL dependency** for current use cases
