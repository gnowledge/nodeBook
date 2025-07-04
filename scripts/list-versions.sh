#!/bin/bash

# List available NodeBook versions and deployments
set -e

echo "📋 Available NodeBook Versions"
echo "=============================="

# List Docker images
echo ""
echo "🐳 Docker Images:"
docker images | grep nodebook | grep -E "(backend|frontend)" | while read line; do
    echo "  $line"
done

# List deployments
echo ""
echo "📁 Deployments:"
if [ -d "deployments" ]; then
    for dir in deployments/*; do
        if [ -d "$dir" ]; then
            version=$(basename "$dir")
            if [ -f "$dir/version.info" ]; then
                echo "  📂 $version"
                echo "    $(cat "$dir/version.info")"
            else
                echo "  📂 $version (no version info)"
            fi
        fi
    done
else
    echo "  No deployments found"
fi

# List git tags
echo ""
echo "🏷️  Git Tags:"
git tag --sort=-version:refname | head -10 | while read tag; do
    echo "  🏷️  $tag"
done

# List branches
echo ""
echo "🌿 Git Branches:"
git branch -r | grep -v HEAD | while read branch; do
    echo "  🌿 $branch"
done

# Show current version
echo ""
echo "📍 Current Version:"
if [ -f "version.info" ]; then
    cat version.info
else
    echo "  Git: $(git rev-parse --short HEAD) ($(git branch --show-current))"
fi

echo ""
echo "Usage:"
echo "  ./scripts/deploy-version.sh <version> [environment]"
echo "  ./scripts/deploy-prod.sh <domain> <email>" 