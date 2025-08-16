#!/bin/bash

# Stop all NodeBook backend and frontend servers, for both development and AppImage.

echo "Stopping NodeBook services..."

# --- Development ---

# Kill the backend Node.js server (development)
echo "Stopping development backend server (node server.js)..."
pkill -f "node nodebook-base/server.js"

# Kill the frontend Vite dev server (development)
echo "Stopping development frontend server (vite)..."
pkill -f "vite"

# --- AppImage ---

# Kill the AppImage processes (packaged app)
# This targets the main process created when the AppImage is run.
echo "Stopping AppImage processes (nodebook-electron)..."
pkill -f "nodebook-electron"

echo "All services stopped."