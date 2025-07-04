# NodeBook Deployment Guide

This guide covers how to deploy NodeBook using Docker containers for server deployment and Electron packages for desktop applications.

## Quick Start

### For Developers
```bash
# Build and run with Docker Compose
./scripts/build-docker.sh
docker-compose up

# Or run in development mode
docker-compose --profile dev up
```

### For Desktop Users
```bash
# Build Electron packages
./scripts/build-electron.sh

# Packages will be available in electron/dist/
```

### For Production Releases
```bash
# Build complete release (Docker + Electron)
./scripts/release.sh 0.1.0
```

## Docker Deployment

### Prerequisites
- Docker and Docker Compose installed
- At least 2GB RAM available
- Ports 3000 and 8000 available

### Quick Deployment
1. **Build the images:**
   ```bash
   ./scripts/build-docker.sh
   ```

2. **Run the application:**
   ```bash
   docker-compose up -d
   ```

   The backend will automatically run the post-install script which:
   - Creates an admin user (username: `admin`, password: `admin123`)
   - Downloads the spaCy language model

3. **Access the application:**
   - Frontend: http://localhost:3000
   - API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Development Mode
For development with hot reload:
```bash
docker-compose --profile dev up
```

This will run:
- Backend on port 8001 with auto-reload
- Frontend on port 3001 with hot reload

### Production Configuration
For production deployment, consider:
- Using a reverse proxy (nginx)
- Setting up SSL certificates
- Configuring proper logging
- Setting up monitoring

Example production docker-compose:
```yaml
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend

  backend:
    image: nodebook-backend:latest
    environment:
      - PYTHONPATH=/app
    volumes:
      - ./graph_data:/app/graph_data
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    image: nodebook-frontend:latest
    restart: unless-stopped
```

## Electron Desktop Application

### Building Packages

#### Prerequisites
- Node.js 18+
- Python 3.11+ (for backend)
- Platform-specific build tools:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: build-essential, libgtk-3-dev

#### Build Commands
```bash
# Build for current platform
cd electron
npm run dist

# Build for specific platforms
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

#### Package Types
- **Windows**: `.exe` installer and portable `.exe`
- **macOS**: `.dmg` disk image
- **Linux**: `.AppImage` and `.deb` package

### Distribution
1. **Windows**: Run the `.exe` installer
2. **macOS**: Mount the `.dmg` and drag to Applications
3. **Linux**: 
   - AppImage: Make executable and run
   - Deb: Install with `sudo dpkg -i package.deb`

## Release Management

### Creating a Release
```bash
# Create release v1.0.0
./scripts/release.sh 1.0.0

# This will:
# 1. Update version numbers
# 2. Build Docker images
# 3. Build Electron packages
# 4. Create release directory with all artifacts
```

### Release Contents
```
releases/v1.0.0/
├── nodebook-backend-v1.0.0.tar.gz
├── nodebook-frontend-v1.0.0.tar.gz
├── NodeBook Setup v1.0.0.exe
├── NodeBook v1.0.0.dmg
├── NodeBook v1.0.0.AppImage
├── deploy-docker.sh
└── RELEASE_NOTES.md
```

### Deploying a Release
```bash
cd releases/v1.0.0
./deploy-docker.sh
```

## Configuration

### Environment Variables
- `VITE_API_BASE_URL`: Frontend API base URL
- `PYTHONPATH`: Python path for backend
- `NODE_ENV`: Node.js environment

### Data Persistence
- `graph_data/`: User graphs and schemas
- `logs/`: Application logs
- `backend/graph_data/`: Backend data directory

### Port Configuration
- **Frontend**: 3000 (dev) / 80 (prod)
- **Backend**: 8000
- **API Docs**: 8000/docs

## Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Check if containers are running
docker ps

# View logs
docker-compose logs

# Rebuild images
docker-compose build --no-cache
```

#### Electron Issues
```bash
# Clear electron cache
rm -rf electron/node_modules
cd electron && npm install

# Rebuild frontend
cd frontend && npm run build
```

#### Backend Issues
```bash
# Check backend health
curl http://localhost:8000/api/health

# View backend logs
docker-compose logs backend
```

### Performance Optimization
- Use Docker volumes for data persistence
- Configure proper resource limits
- Enable gzip compression
- Use CDN for static assets

### Security Considerations
- Use HTTPS in production
- Configure CORS properly
- Set up proper authentication
- Regular security updates

## Support

For issues and questions:
1. Check the logs: `docker-compose logs`
2. Verify configuration
3. Check system requirements
4. Review troubleshooting section

## Contributing

To contribute to deployment:
1. Test changes locally
2. Update documentation
3. Create pull request
4. Include deployment notes 