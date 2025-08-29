#!/bin/bash

echo "🚀 Starting NodeBook SimpleGraph Server..."
echo "📁 Current directory: $(pwd)"
echo "🔧 Using SimpleGraph implementation"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if the server file exists
if [ ! -f "server-simple.js" ]; then
    echo "❌ Error: server-simple.js not found!"
    echo "Please make sure you're in the correct directory."
    exit 1
fi

# Set default data path if not provided
DATA_PATH=${1:-"./user_data"}
echo "📁 Data path: $DATA_PATH"

# Start the server
echo "🌟 Starting server with SimpleGraph..."
echo "🔗 Server will be available at: http://localhost:3000"
echo "🔗 Health check: http://localhost:3000/api/health"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Start the server with the data path
node server-simple.js "$DATA_PATH"
