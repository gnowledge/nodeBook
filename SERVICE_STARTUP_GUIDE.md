# NodeBook Service Startup Guide

This guide explains how to properly start the NodeBook backend and frontend services using the provided scripts to avoid import and path issues.

## 🚀 Quick Start

### Option 1: Start Both Services Together
```bash
# From the project root directory
source venv/bin/activate  # or source python_env/bin/activate
./scripts/start_services.sh
```

### Option 2: Start Services Individually
```bash
# From the project root directory
source venv/bin/activate  # or source python_env/bin/activate

# Start backend only
./scripts/start_backend.sh

# Start frontend only (in another terminal)
./scripts/start_frontend.sh
```

## 📋 Prerequisites

1. **Virtual Environment**: Make sure you're in the correct virtual environment
   ```bash
   source venv/bin/activate  # or source python_env/bin/activate
   ```

2. **Project Root**: Always run scripts from the project root directory
   ```bash
   cd /home/nagarjun/dev/nodeBook
   ```

3. **Dependencies**: Ensure all dependencies are installed
   ```bash
   # Backend dependencies
   pip install -r backend/requirements.txt
   
   # Frontend dependencies
   cd frontend && npm install && cd ..
   ```

## 🔧 Script Details

### `scripts/start_services.sh`
- Starts both backend and frontend simultaneously
- Sets proper `PYTHONPATH` for backend imports
- Handles process cleanup
- Provides status messages

### `scripts/start_backend.sh`
- Starts only the backend server
- Sets `PYTHONPATH="$(pwd)/backend"`
- Runs on `http://localhost:8000`
- Includes virtual environment validation

### `scripts/start_frontend.sh`
- Starts only the frontend server
- Installs dependencies if needed
- Runs on `http://localhost:5173` (or next available port)
- Includes directory validation

## 🐛 Common Issues and Solutions

### Issue: "ModuleNotFoundError: No module named 'backend'"
**Solution**: Use the provided scripts which set the correct `PYTHONPATH`

### Issue: "Address already in use"
**Solution**: The scripts automatically kill existing processes before starting

### Issue: "Not running in the correct virtual environment"
**Solution**: Activate the virtual environment first
```bash
source venv/bin/activate  # or source python_env/bin/activate
```

### Issue: "Not in the correct directory"
**Solution**: Run scripts from the project root directory
```bash
cd /home/nagarjun/dev/nodeBook
```

## 🧪 Testing the OpenAI Summary Feature

Once services are running:

1. **Backend**: http://localhost:8000
2. **Frontend**: http://localhost:5173
3. **API Health Check**: http://localhost:8000/api/health

### Test the Summary Feature:
1. Open http://localhost:5173 in your browser
2. Create or open a graph
3. Click on any node without a description
4. Click "Get Summary (OpenAI)" button
5. The summary will be generated and saved automatically

## 📊 Service URLs

- **Backend API**: http://localhost:8000
- **Frontend App**: http://localhost:5173
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/api/health

## 🛑 Stopping Services

### If using `start_services.sh`:
- Press `Ctrl+C` to stop both services

### If using individual scripts:
- Press `Ctrl+C` in each terminal
- Or use: `pkill -f uvicorn` and `pkill -f vite`

## 🔍 Debugging

### Check if services are running:
```bash
# Check backend
curl http://localhost:8000/api/health

# Check frontend
curl http://localhost:5173

# Check processes
ps aux | grep -E "(uvicorn|vite)"
```

### View logs:
- Backend logs appear in the terminal where you started the backend
- Frontend logs appear in the terminal where you started the frontend

## 📝 Environment Variables

Make sure your `.env` file in the backend directory contains:
```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Other configurations
EMAIL_FEATURES_ENABLED=false
```

## ✅ Verification Checklist

- [ ] Virtual environment activated
- [ ] In project root directory
- [ ] Backend running on http://localhost:8000
- [ ] Frontend running on http://localhost:5173
- [ ] OpenAI API key configured in `.env`
- [ ] Can access API docs at http://localhost:8000/docs
- [ ] Can access frontend at http://localhost:5173

## 🚨 Important Notes

1. **Always use the scripts**: Don't manually start uvicorn or vite to avoid import issues
2. **Check virtual environment**: The scripts validate you're in the correct environment
3. **Use project root**: Scripts automatically navigate to correct directories
4. **PYTHONPATH**: The backend script sets the correct Python path for imports
5. **Process cleanup**: Scripts automatically kill existing processes before starting

This ensures consistent startup and avoids the import/module issues we encountered during development. 