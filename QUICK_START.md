# NodeBook Quick Start Guide

Get NodeBook running in minutes with Docker or build your own desktop application.

## 🚀 Quick Start (Docker)

### Prerequisites
- Docker and Docker Compose installed
- 2GB+ RAM available
- Ports 3000 and 8000 free

### 1. Clone and Build
```bash
git clone <your-repo-url>
cd nodeBook

# Build Docker images
./scripts/build-docker.sh
```

### 2. Run the Application
```bash
# Start all services
docker-compose up -d

# Or run in foreground to see logs
docker-compose up
```

### 3. Access NodeBook
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

**Note**: The backend automatically runs a post-install script that creates an admin user (username: `admin`, password: `admin123`) and downloads required language models.

### 4. Stop the Application
```bash
docker-compose down
```

## 🖥️ Desktop Application

### Prerequisites
- Node.js 18+
- Python 3.11+
- Platform-specific build tools

### Build Desktop App
```bash
# Build frontend
cd frontend && npm install && npm run build

# Build Electron package
cd electron && npm install && npm run dist
```

### Install Desktop App
- **Windows**: Run the `.exe` installer
- **macOS**: Mount `.dmg` and drag to Applications
- **Linux**: Make AppImage executable and run

## 🧪 Test Your Setup

### Test Docker Deployment
```bash
./scripts/test-docker.sh
```

This will:
- Build Docker images
- Start services
- Test health endpoints
- Verify accessibility

### Test Electron Build
```bash
cd electron
npm run pack  # Creates unpacked app
npm run dist  # Creates installable packages
```

## 🔧 Development Mode

### Docker Development
```bash
# Run with hot reload
docker-compose --profile dev up

# Services will be available at:
# Frontend: http://localhost:3001
# Backend: http://localhost:8001
```

### Local Development
```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## 📦 Create a Release

### Build Complete Release
```bash
./scripts/release.sh 1.0.0
```

This creates:
- Docker images
- Electron packages for all platforms
- Deployment scripts
- Release notes

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

## 🐛 Troubleshooting

### Common Issues

#### Docker Issues
```bash
# Check if Docker is running
docker info

# Rebuild images
docker-compose build --no-cache

# View logs
docker-compose logs
```

#### Port Conflicts
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :8000

# Use different ports
docker-compose -f docker-compose.yml up -p 3001 -p 8001
```

#### Electron Issues
```bash
# Clear cache
rm -rf electron/node_modules
cd electron && npm install

# Rebuild frontend
cd frontend && npm run build
```

### Get Help
1. Check the logs: `docker-compose logs`
2. Verify configuration
3. Check system requirements
4. Review `DEPLOYMENT.md` for detailed information

## 📚 Next Steps

- Read `DEPLOYMENT.md` for detailed deployment options
- Check `docs/` for comprehensive documentation
- Explore the API at http://localhost:8000/docs
- Try creating your first graph in the application

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `./scripts/test-docker.sh`
5. Submit a pull request

Happy coding! 🎉 