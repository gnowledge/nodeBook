#!/bin/bash

# Manual deployment script for GitHub Pages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Building Documentation for GitHub Pages${NC}"
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
echo -e "${BLUE}📁 Documentation built in: docs/site/${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Push changes to trigger GitHub Actions deployment"
echo "2. Go to https://github.com/gnowledge/nodeBook/settings/pages"
echo "3. Set Source to 'GitHub Actions'"
echo "4. Your docs will be available at: https://gnowledge.github.io/nodeBook-docs/"
echo ""
echo -e "${GREEN}✨ Documentation build complete!${NC}" 