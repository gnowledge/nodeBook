#!/bin/bash

echo "🚀 NodeBook P2P Development Environment Launcher"
echo "================================================"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ docker-compose is not available. Please install docker-compose and try again."
    exit 1
fi

echo "🔍 Checking prerequisites..."
echo "✅ Docker is running"
echo "✅ docker-compose is available"
echo ""

echo "Choose your action:"
echo ""
echo "1️⃣  Start Core P2P Environment"
echo "    - Auth Service + P2P Server + P2P Monitor + Redis"
echo "    - Essential services we can definitely run"
echo ""
echo "2️⃣  Start Full P2P Environment"
echo "    - All services including external microservices"
echo "    - Requires NLP, WordNet, Media, Frontend services"
echo ""
echo "3️⃣  Stop P2P Development Environment"
echo "    - Stop all running containers"
echo "    - Clean up resources"
echo ""
echo "4️⃣  Test P2P Development Environment"
echo "    - Run comprehensive tests"
echo "    - Verify all services"
echo ""
echo "5️⃣  View P2P Development Status"
echo "    - Check container status"
echo "    - View logs and metrics"
echo ""
echo "6️⃣  Reset P2P Development Environment"
echo "    - Stop, remove, and restart all containers"
echo "    - Fresh start with clean state"
echo ""

read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting Core P2P Development Environment..."
        echo "   This will start essential P2P services we can definitely run."
        echo "   Please wait..."
        echo ""
        
        # Use docker-compose or docker compose based on availability
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-core.yml up -d
        else
            docker compose -f docker-compose-p2p-core.yml up -d
        fi
        
        echo ""
        echo "✅ Core P2P Development Environment started!"
        echo ""
        echo "📊 Service Status:"
        echo "   Auth Service: http://localhost:3005"
        echo "   P2P Server: http://localhost:3000"
        echo "   P2P Monitor: http://localhost:3004"
        echo "   Redis: localhost:6379"
        echo ""
        echo "🔍 To view logs: ./start-p2p-dev.sh 5"
        echo "🧪 To run tests: ./start-p2p-dev.sh 4"
        ;;
        
    2)
        echo ""
        echo "🚀 Starting Full P2P Development Environment..."
        echo "   This will attempt to start all services including external microservices."
        echo "   Note: This may fail if external services are not available."
        echo "   Please wait..."
        echo ""
        
        # Use docker-compose or docker compose based on availability
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-dev.yml up -d
        else
            docker compose -f docker-compose-p2p-dev.yml up -d
        fi
        
        echo ""
        echo "✅ Full P2P Development Environment started!"
        echo ""
        echo "📊 Service Status:"
        echo "   Auth Service: http://localhost:3005"
        echo "   P2P Server: http://localhost:3000"
        echo "   Media Backend: http://localhost:3001"
        echo "   NLP Service: http://localhost:3002"
        echo "   WordNet Service: http://localhost:3003"
        echo "   P2P Monitor: http://localhost:3004"
        echo "   Frontend: http://localhost:5173"
        echo "   Redis: localhost:6379"
        echo ""
        echo "🔍 To view logs: ./start-p2p-dev.sh 5"
        echo "🧪 To run tests: ./start-p2p-dev.sh 4"
        ;;
        
    3)
        echo ""
        echo "🛑 Stopping P2P Development Environment..."
        echo ""
        
        # Stop both core and full environments
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-core.yml down
            docker-compose -f docker-compose-p2p-dev.yml down
        else
            docker compose -f docker-compose-p2p-core.yml down
            docker compose -f docker-compose-p2p-dev.yml down
        fi
        
        echo "✅ P2P Development Environment stopped!"
        ;;
        
    4)
        echo ""
        echo "🧪 Testing P2P Development Environment..."
        echo "   Running comprehensive tests..."
        echo ""
        
        # Wait a moment for services to be ready
        sleep 5
        
        # Run the test script from nodebook-base directory
        cd nodebook-base && node test-p2p-dev-environment.js
        ;;
        
    5)
        echo ""
        echo "📊 P2P Development Environment Status..."
        echo ""
        
        # Check both compose files
        if command -v docker-compose &> /dev/null; then
            echo "Core Environment:"
            docker-compose -f docker-compose-p2p-core.yml ps
            echo ""
            echo "Full Environment:"
            docker-compose -f docker-compose-p2p-dev.yml ps
        else
            echo "Core Environment:"
            docker compose -f docker-compose-p2p-core.yml ps
            echo ""
            echo "Full Environment:"
            docker compose -f docker-compose-p2p-dev.yml ps
        fi
        
        echo ""
        echo "📋 Container Logs:"
        echo "   Auth Service: docker logs nodebook-auth-service-core-dev"
        echo "   P2P Server: docker logs nodebook-p2p-core-dev"
        echo "   P2P Monitor: docker logs nodebook-p2p-monitor-core-dev"
        echo "   Redis: docker logs nodebook-redis-p2p-core-dev"
        ;;
        
    6)
        echo ""
        echo "🔄 Resetting P2P Development Environment..."
        echo "   This will stop, remove, and restart all containers."
        echo ""
        
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-core.yml down -v
            docker-compose -f docker-compose-p2p-dev.yml down -v
            docker-compose -f docker-compose-p2p-core.yml up -d
        else
            docker compose -f docker-compose-p2p-core.yml down -v
            docker compose -f docker-compose-p2p-dev.yml down -v
            docker compose -f docker-compose-p2p-core.yml up -d
        fi
        
        echo ""
        echo "✅ P2P Development Environment reset and restarted!"
        echo "   Please wait a moment for all services to be ready."
        ;;
        
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "🎯 Next steps:"
echo "   - Wait for all services to start (check with option 5)"
echo "   - Test the environment (option 4)"
echo "   - Access services at the URLs shown above"
echo "   - Use './start-p2p-dev.sh 3' to stop when done"
echo ""
