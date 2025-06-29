#!/bin/bash

# Setup script for nodebook.github.io GitHub Pages repository

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up nodebook.github.io GitHub Pages${NC}"
echo ""

echo -e "${YELLOW}Step 1: Create the new repository${NC}"
echo "1. Go to https://github.com/new"
echo "2. Repository name: nodebook.github.io"
echo "3. Make it Public"
echo "4. Don't initialize with README (we'll push our docs)"
echo "5. Click 'Create repository'"
echo ""

read -p "Press Enter after creating the repository..."

echo -e "${YELLOW}Step 2: Add the new remote${NC}"
echo "Adding nodebook.github.io as a remote repository..."

# Add the new remote
git remote add pages https://github.com/nodebook/nodebook.github.io.git

echo -e "${GREEN}✅ Remote added successfully!${NC}"
echo ""

echo -e "${YELLOW}Step 3: Build and deploy documentation${NC}"
echo "Building documentation..."

# Build the documentation
bash scripts/build_docs.sh

echo -e "${GREEN}✅ Documentation built successfully!${NC}"
echo ""

echo -e "${YELLOW}Step 4: Deploy to GitHub Pages${NC}"
echo "Deploying to nodebook.github.io..."

# Create a temporary branch for deployment
cd docs/site

# Initialize git in the site directory
git init
git add .
git commit -m "Initial documentation deployment"

# Push to the pages repository
git branch -M main
git remote add origin https://github.com/nodebook/nodebook.github.io.git
git push -u origin main --force

echo -e "${GREEN}✅ Documentation deployed successfully!${NC}"
echo ""

echo -e "${BLUE}🎉 Setup Complete!${NC}"
echo ""
echo -e "${GREEN}Your documentation is now available at:${NC}"
echo -e "${BLUE}https://nodebook.github.io${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Go to https://github.com/nodebook/nodebook.github.io/settings/pages"
echo "2. Under 'Source', select 'Deploy from a branch'"
echo "3. Select 'main' branch and '/ (root)' folder"
echo "4. Click 'Save'"
echo ""
echo -e "${YELLOW}Future deployments:${NC}"
echo "The GitHub Actions workflow will automatically deploy updates when you push to the main branch."
echo ""
echo -e "${GREEN}✨ All done! Your documentation is live!${NC}" 