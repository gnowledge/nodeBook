#!/bin/bash

echo "🚀 NodeBook Server Launcher"
echo "=========================="
echo ""
echo "Choose your NodeBook version:"
echo ""
echo "1️⃣  SimpleGraph (Traditional)"
echo "    - Centralized storage"
echo "    - Institutional compliance"
echo "    - Familiar, controlled environment"
echo ""
echo "2️⃣  P2P Version (Advanced)"
echo "    - Distributed, encrypted storage"
echo "    - Real-time collaboration"
echo "    - Enhanced privacy and security"
echo ""
echo "3️⃣  Test Both Versions"
echo "    - Run tests for both implementations"
echo ""

read -p "Enter your choice (1, 2, or 3): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting SimpleGraph Server..."
        echo "   Port: 3000"
        echo "   Storage: Local file system"
        echo "   Press Ctrl+C to stop"
        echo ""
        node server-simple.js
        ;;
    2)
        echo ""
        echo "🚀 Starting P2P Server..."
        echo "   Port: 3000"
        echo "   Storage: Encrypted P2P network"
        echo "   Press Ctrl+C to stop"
        echo ""
        node server-p2p.js
        ;;
    3)
        echo ""
        echo "🧪 Testing Both Versions..."
        echo ""
        
        echo "1️⃣ Testing SimpleGraph..."
        node test-simple-graph-core.js
        echo ""
        
        echo "2️⃣ Testing P2P Graph..."
        node test-p2p-simple.js
        echo ""
        
        echo "✅ All tests completed!"
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac
