#!/bin/bash

echo "🛑 Stopping NodeBook Development Environment..."

# Stop all services
docker compose -f docker-compose.dev.yml down

echo "✅ All services stopped!"
echo ""
echo "💡 To start again, run: ./start-dev.sh"
