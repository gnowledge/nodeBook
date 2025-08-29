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
echo "1️⃣  Start P2P Development Environment"
echo "    - P2P Server + NLP + WordNet + Monitor"
echo "    - All services in Docker containers"
echo ""
echo "2️⃣  Stop P2P Development Environment"
echo "    - Stop all running containers"
echo "    - Clean up resources"
echo ""
echo "3️⃣  Test P2P Development Environment"
echo "    - Run comprehensive tests"
echo "    - Verify all services"
echo ""
echo "4️⃣  View P2P Development Status"
echo "    - Check container status"
echo "    - View logs and metrics"
echo ""
echo "5️⃣  Reset P2P Development Environment"
echo "    - Stop, remove, and restart all containers"
echo "    - Fresh start with clean state"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting P2P Development Environment..."
        echo "   This will start all services in Docker containers."
        echo "   Please wait..."
        echo ""
        
        # Use docker-compose or docker compose based on availability
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-dev.yml up -d
        else
            docker compose -f docker-compose-p2p-dev.yml up -d
        fi
        
        echo ""
        echo "✅ P2P Development Environment started!"
        echo ""
        echo "📊 Service Status:"
        echo "   P2P Server: http://localhost:3000"
        echo "   NLP Service: http://localhost:3001"
        echo "   WordNet Service: http://localhost:3002"
        echo "   P2P Monitor: http://localhost:3003"
        echo "   Frontend: http://localhost:8080"
        echo ""
        echo "🔍 To view logs: ./start-p2p-dev.sh 4"
        echo "🧪 To run tests: ./start-p2p-dev.sh 3"
        ;;
        
    2)
        echo ""
        echo "🛑 Stopping P2P Development Environment..."
        echo ""
        
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-dev.yml down
        else
            docker compose -f docker-compose-p2p-dev.yml down
        fi
        
        echo "✅ P2P Development Environment stopped!"
        ;;
        
    3)
        echo ""
        echo "🧪 Testing P2P Development Environment..."
        echo "   Running comprehensive tests..."
        echo ""
        
        # Wait a moment for services to be ready
        sleep 5
        
        # Run the test script
        node test-p2p-dev-environment.js
        ;;
        
    4)
        echo ""
        echo "📊 P2P Development Environment Status..."
        echo ""
        
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-dev.yml ps
        else
            docker compose -f docker-compose-p2p-dev.yml ps
        fi
        
        echo ""
        echo "📋 Container Logs:"
        echo "   P2P Server: docker logs nodebook-p2p"
        echo "   NLP Service: docker logs nodebook-nlp"
        echo "   WordNet Service: docker logs nodebook-wordnet"
        echo "   P2P Monitor: docker logs nodebook-p2p-monitor"
        ;;
        
    5)
        echo ""
        echo "🔄 Resetting P2P Development Environment..."
        echo "   This will stop, remove, and restart all containers."
        echo ""
        
        if command -v docker-compose &> /dev/null; then
            docker-compose -f docker-compose-p2p-dev.yml down -v
            docker-compose -f docker-compose-p2p-dev.yml up -d
        else
            docker compose -f docker-compose-p2p-dev.yml down -v
            docker compose -f docker-compose-p2p-dev.yml up -d
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
echo "   - Wait for all services to start (check with option 4)"
echo "   - Test the environment (option 3)"
echo "   - Access services at the URLs shown above"
echo "   - Use './start-p2p-dev.sh 2' to stop when done"
echo ""
