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

# Change to project root
cd "$(dirname "$0")/.."

# Activate virtual environment
source venv/bin/activate

# Build documentation
echo -e "${YELLOW}Building documentation...${NC}"
cd docs
mkdocs build

echo -e "${GREEN}✅ Documentation built successfully!${NC}"
echo ""

# Deploy to gnowgi/nodebook.github.io
echo -e "${YELLOW}Deploying to gnowgi/nodebook.github.io...${NC}"
cd site

# Initialize git repository
git init
git config user.name "Documentation Deployer"
git config user.email "deploy@nodebook.org"

# Add all files
git add .

# Commit changes
git commit -m "Deploy documentation from nodeBook repository - $(date)"

# Set up remote and push
git branch -M main
git remote add origin https://github.com/gnowgi/nodebook.github.io.git

echo -e "${YELLOW}Pushing to gnowgi/nodebook.github.io...${NC}"
git push -f origin main

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