#!/bin/bash

# Manual deployment script for nodebook.github.io

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Deploying Documentation to nodebook.github.io${NC}"
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

# Deploy to nodebook.github.io
echo -e "${YELLOW}Deploying to nodebook.github.io...${NC}"
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
git remote add origin https://github.com/gnowledge/nodebook.github.io.git

echo -e "${YELLOW}Pushing to nodebook.github.io...${NC}"
git push -f origin main

echo -e "${GREEN}✅ Documentation deployed successfully!${NC}"
echo ""
echo -e "${BLUE}🎉 Your documentation is now available at:${NC}"
echo -e "${GREEN}https://gnowledge.github.io/nodebook.github.io/${NC}"
echo ""
echo -e "${YELLOW}Note:${NC} It may take a few minutes for GitHub Pages to update." 