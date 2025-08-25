# 🚀 NodeBook Development Environment

This document explains how to use the integrated development environment for NodeBook.

## 🎯 What's Included

The development environment includes:

- **Frontend**: React + Vite development server (port 5173)
- **Main Backend**: NodeBook backend server (port 3000)
- **Media Backend**: File upload and management service (port 3001)
- **Docker Compose**: Single command to start all services

## 🚀 Quick Start

### Option 1: Use the Startup Script (Recommended)
```bash
# Start all services
./start-dev.sh

# Stop all services
./stop-dev.sh
```

### Option 2: Manual Docker Compose
```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Stop all services
docker compose -f docker-compose.dev.yml down

# View logs
docker compose -f docker-compose.dev.yml logs -f
```

## 📱 Services

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | React development server with hot reload |
| **Main Backend** | http://localhost:3000 | NodeBook backend API |
| **Media Backend** | http://localhost:3001 | File upload and management |

## 🔧 Development Workflow

### 1. Start Development Environment
```bash
./start-dev.sh
```

### 2. Make Code Changes
- Frontend code is in `nodebook-base/frontend/src/`
- Backend code is in `nodebook-base/`
- Media backend code is in `media-backend/`

### 3. View Changes
- Frontend: Changes auto-reload at http://localhost:5173
- Backend: Restart container to see changes
- Media Backend: Restart container to see changes

### 4. Stop Development Environment
```bash
./stop-dev.sh
```

## 📁 File Structure

```
nodeBook/
├── docker-compose.dev.yml          # Main development compose file
├── start-dev.sh                   # Startup script
├── stop-dev.sh                    # Stop script
├── nodebook-base/                 # Main application
│   ├── frontend/                  # React frontend
│   └── server.js                  # Backend server
└── media-backend/                 # Media management service
    ├── server.js                  # Media server
    ├── media-data/                # Uploaded files storage
    └── Dockerfile                 # Media service container
```

## 🖼️ Media Management

The Media Backend provides:

- **File Upload**: Drag & drop or click to browse
- **File Management**: View, download, delete files
- **CNL Integration**: Copy markdown, HTML, or attribute syntax
- **Image Attributes**: Use `has Image: URL` in node definitions

### Example Usage in CNL:
```markdown
# Snake
has Image: http://localhost:3001/api/media/files/FILE_ID
Description: A venomous snake species
Relations: eats Mice, lives in Forest
```

## 🐛 Troubleshooting

### Port Conflicts
If you get port conflicts:
```bash
# Check what's using the port
lsof -i :3001

# Stop conflicting services
docker compose -f media-backend/docker-compose.media.yml down
```

### Container Issues
```bash
# View container status
docker ps

# View logs for specific service
docker compose -f docker-compose.dev.yml logs media-backend

# Restart specific service
docker compose -f docker-compose.dev.yml restart media-backend
```

### Rebuild Everything
```bash
# Stop and remove everything
docker compose -f docker-compose.dev.yml down --volumes --remove-orphans

# Rebuild and start
docker compose -f docker-compose.dev.yml up -d --build
```

## 🔄 Environment Variables

The frontend automatically uses:
- `VITE_API_TARGET=http://backend:3000` (for main backend)
- `VITE_MEDIA_BACKEND_URL=http://localhost:3001` (for media backend)

## 📝 Development Tips

1. **Use the startup script**: `./start-dev.sh` handles everything
2. **Check service health**: The startup script shows service status
3. **View logs**: Use `docker compose -f docker-compose.dev.yml logs -f`
4. **Media files persist**: Uploaded files are stored in `./media-backend/media-data/`
5. **Hot reload**: Frontend changes auto-reload, backend requires container restart

## 🎉 Success!

When everything is working, you should see:
- ✅ Frontend running at http://localhost:5173
- ✅ Main Backend running at http://localhost:3000  
- ✅ Media Backend running at http://localhost:3001
- ✅ All services communicating with each other

Happy coding! 🚀
