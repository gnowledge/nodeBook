# LOCAL_BACKEND Environment Variable Setup

## Implementation Summary

The `LOCAL_BACKEND` feature has been implemented to support standalone installations where frontend and backend run on the same machine. When `VITE_LOCAL_BACKEND=true` is set:

### What was implemented:
1. **Environment Variable Support**: Added `VITE_LOCAL_BACKEND` environment variable support
2. **Config Updates**: Modified `config.js` to use `window.location.origin` when LOCAL_BACKEND is enabled
3. **Login Component**: Updated to conditionally hide server address field
4. **Register Component**: Updated to conditionally hide server address field  
5. **Backend CORS**: Already configured to accept connections from any origin
6. **Cross-Platform Template**: Created `env` file template for easy setup

### Files Modified:
- `frontend/src/config.js` - Added LOCAL_BACKEND logic and helper function
- `frontend/src/Login.jsx` - Conditionally hide server address field
- `frontend/src/Register.jsx` - Conditionally hide server address field
- `frontend/env` - Environment variables template file
- `frontend/LOCAL_BACKEND_SETUP.md` - This documentation file

---

This document explains how to use the `LOCAL_BACKEND` environment variable for standalone installations where the frontend and backend are running on the same machine.

## Overview

When `VITE_LOCAL_BACKEND=true` is set, the frontend will:
- Hide the server address field on the login page
- Automatically use `window.location.origin` as the backend address
- Prevent users from seeing or modifying the backend address
- Simplify the login experience for standalone deployments

## Setup Instructions

### 1. Create Environment File

**Option A: Using the template file (Recommended)**
```bash
# Copy the template file to .env
cp env .env

# Edit the .env file to enable LOCAL_BACKEND
# Change VITE_LOCAL_BACKEND=false to VITE_LOCAL_BACKEND=true
```

**Option B: Create manually**
```bash
# Create .env file manually
echo "VITE_LOCAL_BACKEND=true" > .env
```

**Windows Users:**
```cmd
# Using Command Prompt
copy env .env

# Or create manually
echo VITE_LOCAL_BACKEND=true > .env
```

**Note:** Windows Explorer hides files starting with `.` by default. You may need to:
1. Enable "Show hidden files" in Folder Options
2. Or use Command Prompt/PowerShell to create the file

### 2. Backend Configuration

The backend is already configured to accept connections from any origin (CORS is set to `allow_origins=["*"]`), so no additional backend configuration is needed.

### 3. Deployment

For standalone installations:
- Frontend and backend should be served from the same origin
- The backend should be accessible at the same domain as the frontend
- Example: Frontend at `https://yourdomain.com` and backend at `https://yourdomain.com:8000`

## Use Cases

### Standalone Installation
```bash
# In .env file
VITE_LOCAL_BACKEND=true
```

### Multi-Backend Support (Default)
```bash
# In .env file (or leave unset)
VITE_LOCAL_BACKEND=false
```

## Security Considerations

- When `LOCAL_BACKEND=true`, users cannot see or modify the backend address
- This prevents users from accidentally connecting to the wrong backend
- Useful for controlled environments where you want to ensure users connect to the intended backend

## Example Deployment Scenarios

### Scenario 1: Single Server Deployment
- Frontend: `https://nodebook.example.com`
- Backend: `https://nodebook.example.com:8000`
- Set `VITE_LOCAL_BACKEND=true`

### Scenario 2: Development Environment
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Set `VITE_LOCAL_BACKEND=true`

### Scenario 3: Multi-Backend Environment
- Allow users to connect to different backends
- Set `VITE_LOCAL_BACKEND=false` (or leave unset)
- Users can specify backend address in login form

## Cross-Platform Compatibility

The `env` template file approach ensures compatibility across all platforms:
- **Linux/macOS**: `cp env .env`
- **Windows**: `copy env .env` or use Command Prompt
- **Docker**: Can copy the template during build process 