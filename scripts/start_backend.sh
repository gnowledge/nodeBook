#!/bin/bash

# Start the nodebook-base backend server
echo "Starting nodebook-base backend..."

# Change to the nodebook-base directory
cd "$(dirname "$0")/../nodebook-base"

# Check if we're in the correct directory
if [[ ! -f "server.js" ]]; then
    echo "❌ Error: Not in the correct directory!"
    echo "Please run this script from the project root directory."
    exit 1
fi

echo "✅ Directory check passed"

# Kill any existing node processes running server.js
echo "🔄 Stopping any existing backend processes..."
pkill -f "node server.js"

# Start the backend server
echo "🚀 Starting backend server..."
node server.js & 