# NodeBook Federated Architecture - Testing Guide

This guide will help you test all the new federated architecture features in the development environment.

## 🚀 **Quick Start Testing**

### **1. Start Development Environment**
```bash
# Start the development environment
npm run dev:docker

# Or start with clean data
npm run dev:docker:clean
```

### **2. Access the Application**
- **Frontend (PWA)**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Default Admin**: `admin` / `admin123`

## 🧪 **Testing Checklist**

### **✅ Authentication System**
- [ ] User registration
- [ ] User login/logout
- [ ] JWT token validation
- [ ] Protected endpoint access
- [ ] User data isolation

### **✅ PWA Features**
- [ ] Service worker registration
- [ ] Offline functionality
- [ ] Install prompt
- [ ] Manifest loading
- [ ] Responsive design

### **✅ Data Management**
- [ ] Create new graphs
- [ ] Data export functionality
- [ ] Data import functionality
- [ ] Backup creation
- [ ] User data statistics

### **✅ P2P Federation**
- [ ] Peer discovery
- [ ] Graph synchronization
- [ ] Conflict resolution
- [ ] Multi-instance testing

## 🔐 **Testing Authentication**

### **1. Test User Registration**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123",
    "email": "test@example.com"
  }'
```

**Expected Response**: 201 Created with user data

### **2. Test User Login**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "testpass123"
  }'
```

**Expected Response**: 200 OK with JWT token

### **3. Test Protected Endpoints**
```bash
# Get JWT token from login response
TOKEN="your-jwt-token-here"

# Test protected endpoint
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/graphs
```

**Expected Response**: 200 OK with user's graphs

### **4. Test Unauthorized Access**
```bash
# Try to access protected endpoint without token
curl http://localhost:3000/api/graphs
```

**Expected Response**: 401 Unauthorized

## 📱 **Testing PWA Features**

### **1. Service Worker**
1. Open browser dev tools
2. Go to Application > Service Workers
3. Verify service worker is registered
4. Check offline functionality

### **2. Install Prompt**
1. Look for install button in browser
2. Test "Add to Home Screen" functionality
3. Verify app icon and name

### **3. Offline Mode**
1. Disconnect network
2. Refresh the page
3. Verify app still works
4. Check cached resources

## 📊 **Testing Data Management**

### **1. Create Test Graph**
```bash
TOKEN="your-jwt-token-here"

curl -X POST http://localhost:3000/api/graphs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Knowledge Graph",
    "author": "Test User",
    "email": "test@example.com"
  }'
```

### **2. Test Data Export**
```bash
curl -X POST http://localhost:3000/api/data/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "includeGraphs": true,
    "includeMedia": true,
    "includeSettings": true
  }'
```

### **3. Test Data Statistics**
```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/data/stats
```

## 🌐 **Testing P2P Federation**

### **1. Start Multiple Instances**
```bash
# Terminal 1: Main instance
npm run dev:docker

# Terminal 2: Second instance (different port)
PORT=3001 npm run dev:docker
```

### **2. Test Peer Connection**
1. Create a graph in instance 1
2. Share the graph key with instance 2
3. Test synchronization between instances

### **3. Test Conflict Resolution**
1. Modify the same graph in both instances
2. Trigger synchronization
3. Verify conflict resolution works

## 🔧 **Automated Testing**

### **1. Run API Tests**
```bash
# Test all API endpoints
npm run test:api
```

### **2. View Development Logs**
```bash
# View real-time logs
npm run dev:logs

# View specific service logs
docker compose -f docker-compose.dev.yml logs -f backend
docker compose -f docker-compose.dev.yml logs -f frontend
```

## 🐛 **Troubleshooting**

### **Common Issues**

#### **1. Port Already in Use**
```bash
# Check what's using the port
lsof -i :3000
lsof -i :5173

# Kill the process
kill -9 <PID>
```

#### **2. Docker Issues**
```bash
# Clean up Docker
docker system prune -f
docker volume prune -f

# Restart Docker service
sudo systemctl restart docker
```

#### **3. Database Issues**
```bash
# Clean development data
npm run dev:docker:clean

# Check database file
ls -la nodebook-base/users.db
```

#### **4. Authentication Issues**
```bash
# Check JWT secret
echo $JWT_SECRET

# Verify environment variables
cat env.dev.example
```

### **Debug Mode**
```bash
# Enable debug logging
export LOG_LEVEL=debug
export ENABLE_DEBUG_LOGGING=true

# Restart services
npm run dev:restart
```

## 📋 **Testing Scenarios**

### **Scenario 1: New User Onboarding**
1. Register new user
2. Login and verify authentication
3. Create first knowledge graph
4. Test basic CRUD operations
5. Export user data

### **Scenario 2: PWA Installation**
1. Open app in browser
2. Test offline functionality
3. Install as PWA
4. Verify native app experience
5. Test offline data access

### **Scenario 3: Multi-User Collaboration**
1. Create multiple test users
2. Verify data isolation
3. Test user-specific graphs
4. Verify no cross-user data access

### **Scenario 4: P2P Federation**
1. Start multiple instances
2. Create graphs in different instances
3. Test peer discovery
4. Test graph synchronization
5. Test conflict resolution

## 🎯 **Performance Testing**

### **1. Load Testing**
```bash
# Test with multiple concurrent users
ab -n 1000 -c 10 http://localhost:3000/api/graphs
```

### **2. Memory Usage**
```bash
# Monitor container resources
docker stats nodebook-backend-dev
docker stats nodebook-frontend-dev
```

### **3. Database Performance**
```bash
# Check database size
du -sh nodebook-base/user_data/
du -sh nodebook-base/users.db
```

## 📝 **Test Results Template**

Create a test results file to track your testing:

```markdown
# Test Results - [Date]

## Environment
- Node.js Version: [version]
- Docker Version: [version]
- OS: [OS version]

## Test Results

### Authentication ✅
- User Registration: [PASS/FAIL]
- User Login: [PASS/FAIL]
- JWT Validation: [PASS/FAIL]
- Data Isolation: [PASS/FAIL]

### PWA Features ✅
- Service Worker: [PASS/FAIL]
- Offline Mode: [PASS/FAIL]
- Install Prompt: [PASS/FAIL]

### Data Management ✅
- Graph Creation: [PASS/FAIL]
- Data Export: [PASS/FAIL]
- Data Import: [PASS/FAIL]

### P2P Federation ✅
- Peer Discovery: [PASS/FAIL]
- Graph Sync: [PASS/FAIL]
- Conflict Resolution: [PASS/FAIL]

## Issues Found
- [Issue description]
- [Issue description]

## Recommendations
- [Recommendation]
- [Recommendation]
```

## 🚀 **Next Steps After Testing**

1. **Fix any issues** found during testing
2. **Optimize performance** based on test results
3. **Update documentation** with findings
4. **Plan production deployment**
5. **Set up monitoring** and logging

## 📞 **Getting Help**

If you encounter issues during testing:

1. **Check the logs**: `npm run dev:logs`
2. **Review this guide** for troubleshooting steps
3. **Check GitHub issues** for known problems
4. **Create detailed bug reports** with reproduction steps

Happy testing! 🎯
