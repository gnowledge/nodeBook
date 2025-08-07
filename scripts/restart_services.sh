#!/bin/bash

# Restart the NodeBook backend and frontend servers

echo "Restarting NodeBook services..."

# First, stop any running services
"$(dirname "$0")/stop_services.sh"

# Wait a moment for ports to be released
sleep 2

# Start the services in the background
echo "Starting backend..."
"$(dirname "$0")/start_backend.sh" &

echo "Starting frontend..."
"$(dirname "$0")/start_frontend.sh" &

echo "All services have been restarted."
