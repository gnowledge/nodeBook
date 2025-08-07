#!/bin/bash

# Stop the NodeBook backend and frontend servers

echo "Stopping NodeBook services..."

# Kill the backend Node.js server
echo "Stopping backend server (node server.js)..."
pkill -f "node nodebook-base/server.js"

# Kill the frontend Vite dev server
echo "Stopping frontend server (vite)..."
pkill -f "vite"

echo "All services stopped."
