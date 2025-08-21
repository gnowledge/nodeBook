# NodeBook Federated Architecture

This document describes the new federated architecture of NodeBook, which enables the same codebase to run as both a centralized web service and a decentralized desktop application.

## 🚀 Overview

NodeBook now supports three deployment scenarios from a single, unified codebase:

1. **Web Service (PWA)**: Docker container serving a Progressive Web App
2. **Desktop Application**: Electron app with local backend and offline-first capabilities
3. **Hybrid Deployment**: Multiple instances that can federate and sync via P2P

## 🏗️ Architecture Components

### Backend (Node.js/Express)
- **Authentication System**: JWT-based authentication with user data segregation
- **Data Management**: Per-user data directories with import/export capabilities
- **P2P Federation**: Hyperswarm integration for peer-to-peer synchronization
- **API Layer**: RESTful API endpoints for all frontend operations

### Frontend (React/PWA)
- **Progressive Web App**: Service worker, manifest, and offline capabilities
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: WebSocket integration for live collaboration

### Desktop Integration (Electron)
- **Local Backend**: Runs Node.js server locally for offline operation
- **Auto-authentication**: Seamless local user experience
- **Data Persistence**: Local storage with optional cloud sync

## 🔐 Authentication & Security

### User Management
- **Local Authentication**: Username/password for both desktop and server deployments
- **Data Segregation**: Each user has isolated data directory
- **Admin Roles**: Administrative users with extended privileges
- **Session Management**: Secure JWT tokens with configurable expiration

### Security Features
- **CORS Protection**: Configurable cross-origin resource sharing
- **Helmet Security**: HTTP security headers
- **Input Validation**: Request validation and sanitization
- **Rate Limiting**: Protection against abuse (configurable)

## 📊 Data Management

### Import/Export System
- **Data Export**: Compressed archives with user data
- **Data Import**: Safe import with validation and backup
- **Backup Creation**: Automatic backups before major operations
- **Metadata Tracking**: Export/import history and statistics

### Data Safety
- **Automatic Backups**: Before imports and major changes
- **Conflict Resolution**: P2P sync conflict handling
- **Data Validation**: Import file format and content validation
- **Rollback Capability**: Restore from backups if needed

## 🌐 P2P Federation

### Peer Management
- **Discovery**: Automatic peer discovery via Hyperswarm
- **Connection**: Manual and automatic peer connections
- **Sync Status**: Real-time peer connection monitoring
- **Conflict Resolution**: Strategies for handling sync conflicts

### Federation Benefits
- **Decentralized**: No single point of failure
- **Scalable**: Add more instances as needed
- **Resilient**: Continues working even if some peers are offline
- **Collaborative**: Share knowledge graphs across instances

## 🚀 Deployment Options

### 1. Docker Deployment (PWA)

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access the PWA at http://localhost:3000
```

**Features:**
- Multi-user support with authentication
- PWA capabilities (installable, offline support)
- Scalable for organizations and schools
- Easy deployment and updates

### 2. Desktop Application

```bash
# Build Electron package
npm run build:electron

# Run locally
npm run dev:electron
```

**Features:**
- Offline-first operation
- Local data storage
- P2P federation capabilities
- Native desktop experience

### 3. Hybrid Deployment

```bash
# Start multiple instances
NODE_ENV=production PORT=3000 npm start  # Instance 1
NODE_ENV=production PORT=3001 npm start  # Instance 2

# Configure federation between instances
```

## 🛠️ Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd nodebook

# Install all dependencies
npm run install:all

# Start development servers
npm run dev:frontend    # Frontend (Vite)
npm run dev:backend     # Backend (Node.js)
npm run dev:electron    # Desktop app
```

### Environment Variables

```bash
# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret

# Server Configuration
PORT=3000
NODE_ENV=production  # or 'desktop' for Electron

# P2P Federation
HYPERSWARM_PORT=49737
```

## 📱 PWA Features

### Progressive Web App
- **Installable**: Add to home screen on mobile/desktop
- **Offline Support**: Service worker caching
- **Push Notifications**: Real-time updates
- **Background Sync**: Offline action synchronization

### Mobile Optimization
- **Responsive Design**: Adapts to all screen sizes
- **Touch Gestures**: Mobile-friendly interactions
- **Performance**: Optimized for mobile devices
- **Accessibility**: Screen reader and keyboard support

## 🔄 P2P Synchronization

### How It Works
1. **Discovery**: Instances discover each other via Hyperswarm
2. **Connection**: Manual or automatic peer connections
3. **Sync**: Knowledge graphs synchronize between peers
4. **Conflict Resolution**: Automatic and manual conflict handling

### Sync Strategies
- **Real-time**: Immediate updates across connected peers
- **Batch**: Periodic synchronization for efficiency
- **Selective**: Choose which graphs to sync
- **Bidirectional**: Two-way synchronization

## 📈 Performance & Scalability

### Optimization Features
- **Lazy Loading**: Load data on demand
- **Caching**: Multiple cache layers (memory, disk, service worker)
- **Compression**: Efficient data transfer
- **Background Processing**: Non-blocking operations

### Scalability
- **Horizontal Scaling**: Add more instances
- **Load Distribution**: Distribute users across instances
- **Resource Management**: Efficient memory and CPU usage
- **Monitoring**: Performance metrics and health checks

## 🧪 Testing

### Test Suite
```bash
# Run all tests
npm test

# Run specific test suites
npm run test:backend
npm run test:frontend
npm run test:integration
```

### Test Coverage
- **Unit Tests**: Individual component testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Full application workflow testing
- **Performance Tests**: Load and stress testing

## 🚀 Deployment

### Production Build
```bash
# Build all components
npm run build:all

# Build specific components
npm run build:frontend
npm run build:docker
npm run build:electron
```

### CI/CD Pipeline
- **GitHub Actions**: Automated testing and building
- **Docker Images**: Containerized deployment
- **Release Management**: Automated release creation
- **Deployment Scripts**: Easy deployment to various environments

## 🔧 Configuration

### Server Configuration
```javascript
// config/server.js
module.exports = {
  port: process.env.PORT || 3000,
  environment: process.env.NODE_ENV || 'development',
  authentication: {
    jwtSecret: process.env.JWT_SECRET,
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  p2p: {
    hyperswarmPort: process.env.HYPERSWARM_PORT || 49737,
    enableAutoDiscovery: true
  }
};
```

### Client Configuration
```javascript
// config/client.js
export const config = {
  apiBaseUrl: process.env.REACT_APP_API_URL || 'http://localhost:3000',
  pwa: {
    enableNotifications: true,
    enableOfflineMode: true
  },
  p2p: {
    enableAutoSync: true,
    syncInterval: 30000 // 30 seconds
  }
};
```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/auth/me` - Get current user info

### Data Management
- `POST /api/data/export` - Export user data
- `POST /api/data/import` - Import user data
- `GET /api/data/stats` - Get data statistics

### Graph Management
- `GET /api/graphs` - List user graphs
- `POST /api/graphs` - Create new graph
- `PUT /api/graphs/:id` - Update graph
- `DELETE /api/graphs/:id` - Delete graph

### P2P Federation
- `GET /api/graphs/:id/peers` - Get peer status
- `POST /api/graphs/:id/peers/sync` - Initiate peer sync

## 🐛 Troubleshooting

### Common Issues

#### Authentication Problems
```bash
# Check JWT configuration
echo $JWT_SECRET
echo $JWT_EXPIRES_IN

# Verify database connection
npm run test:auth
```

#### P2P Sync Issues
```bash
# Check network connectivity
netstat -an | grep 49737

# Verify Hyperswarm configuration
npm run test:p2p
```

#### Performance Issues
```bash
# Monitor resource usage
npm run monitor

# Check cache status
npm run cache:status
```

### Debug Mode
```bash
# Enable debug logging
DEBUG=nodebook:* npm start

# Verbose logging
LOG_LEVEL=debug npm start
```

## 🤝 Contributing

### Development Guidelines
1. **Code Style**: Follow existing patterns and ESLint rules
2. **Testing**: Write tests for new features
3. **Documentation**: Update docs for API changes
4. **Security**: Follow security best practices

### Pull Request Process
1. Create feature branch from `federated-releases`
2. Implement changes with tests
3. Update documentation
4. Submit PR for review

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Hyperswarm**: P2P networking library
- **Electron**: Desktop application framework
- **React**: Frontend framework
- **Express**: Backend framework

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/discussions)
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)

---

**NodeBook Federated Architecture** - Unifying knowledge management across platforms and deployment scenarios.
