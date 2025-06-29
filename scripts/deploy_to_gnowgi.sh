#!/bin/bash

# Deployment script for gnowgi/nodebook.github.io

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Documentation to gnowgi/nodebook.github.io${NC}"
echo ""

# Store the project root directory
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

# Change to project root
cd "$PROJECT_ROOT"

# Activate virtual environment
source venv/bin/activate

# Build documentation
echo -e "${YELLOW}Building documentation...${NC}"
cd docs
mkdocs build

echo -e "${GREEN}✅ Documentation built successfully!${NC}"
echo ""

# Create a temporary directory for deployment
echo -e "${YELLOW}Setting up deployment...${NC}"
cd ..
TEMP_DIR=$(mktemp -d)
echo "Using temporary directory: $TEMP_DIR"

# Clone the target repository
echo -e "${YELLOW}Cloning gnowgi/nodebook.github.io...${NC}"
cd "$TEMP_DIR"
git clone https://github.com/gnowgi/nodebook.github.io.git
cd nodebook.github.io

# Copy the built documentation
echo -e "${YELLOW}Copying built documentation...${NC}"
cp -r "$PROJECT_ROOT/docs/site/"* .

# Add all files
git add .

# Commit changes
git commit -m "Deploy documentation from nodeBook repository - $(date)"

# Push to repository
echo -e "${YELLOW}Pushing to gnowgi/nodebook.github.io...${NC}"
git push origin main

# Clean up
cd ../..
rm -rf "$TEMP_DIR"

echo -e "${GREEN}✅ Documentation deployed successfully!${NC}"
echo ""
echo -e "${BLUE}🎉 Your documentation is now available at:${NC}"
echo -e "${GREEN}https://nodebook.github.io${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to https://github.com/gnowgi/nodebook.github.io/settings/pages"
echo "2. Verify GitHub Pages is enabled"
echo "3. If you want a custom domain, add it in the Pages settings"
echo ""
echo -e "${GREEN}✨ All done! Your documentation is live!${NC}" 