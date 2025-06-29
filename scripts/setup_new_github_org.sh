#!/bin/bash

# Setup script for new GitHub organization documentation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Setting up Documentation with New GitHub Organization${NC}"
echo ""

echo -e "${YELLOW}Step 1: Create a new GitHub organization${NC}"
echo "1. Go to https://github.com/organizations/new"
echo "2. Organization name: nodebook-docs (or similar)"
echo "3. Make it Public"
echo "4. Click 'Create organization'"
echo ""

echo -e "${YELLOW}Step 2: Create the documentation repository${NC}"
echo "1. In the new organization, create a repository named: nodebook-docs.github.io"
echo "2. Make it Public"
echo "3. Don't initialize with README"
echo ""

read -p "Press Enter after creating the organization and repository..."

echo -e "${YELLOW}Step 3: Update configuration${NC}"
echo "Updating mkdocs configuration..."

# Update the mkdocs.yml file
cat > docs/mkdocs.yml << 'EOF'
site_name: NDF Studio Backend Documentation
site_description: Comprehensive documentation for the NDF Studio backend API and implementation
site_author: NDF Studio Team
site_url: https://nodebook-docs.github.io/

# Repository
repo_name: nodebook-docs/nodebook-docs.github.io
repo_url: https://github.com/nodebook-docs/nodebook-docs.github.io
edit_uri: edit/main/docs/docs/

# Theme
theme:
  name: material
  features:
    - navigation.tabs
    - navigation.sections
    - navigation.expand
    - navigation.top
    - search.suggest
    - search.highlight
    - content.code.copy
    - content.code.annotate
  palette:
    - scheme: default
      primary: indigo
      accent: indigo
      toggle:
        icon: material/toggle-switch
        name: Switch to dark mode
    - scheme: slate
      primary: indigo
      accent: indigo
      toggle:
        icon: material/toggle-switch-off-outline
        name: Switch to light mode

# Plugins
plugins:
  - search
  - mkdocstrings:
      default_handler: python
      handlers:
        python:
          paths: [..]
          options:
            show_source: true
            show_root_heading: true
            show_category_heading: true
            show_signature_annotations: true
            show_bases: true
            heading_level: 2
            members_order: source
            docstring_style: google
  - autorefs

# Navigation
nav:
  - Home: index.md
  - API Reference:
    - Core Modules:
      - Models: api/core/models.md
      - Utils: api/core/utils.md
    - Routes:
      - Graph Operations: api/routes/graph_ops.md
  - Development:
    - Installation: development/installation.md

# Markdown extensions
markdown_extensions:
  - admonition
  - codehilite
  - footnotes
  - meta
  - pymdownx.arithmatex:
      generic: true
  - pymdownx.betterem:
      smart_enable: all
  - pymdownx.caret
  - pymdownx.details
  - pymdownx.emoji:
      emoji_generator: !!python/name:material.extensions.emoji.to_svg
  - pymdownx.highlight:
      anchor_linenums: true
      line_spans: __span
      pygments_lang_class: true
  - pymdownx.inlinehilite
  - pymdownx.keys
  - pymdownx.magiclink
  - pymdownx.mark
  - pymdownx.smartsymbols
  - pymdownx.snippets:
      check_paths: true
  - pymdownx.superfences:
      custom_fences:
        - name: mermaid
          class: mermaid
          format: !!python/name:pymdownx.superfences.fence_code_format
  - pymdownx.tabbed:
      alternate_style: true
      combine_header_slug: true
      slugify: !!python/object/apply:pymdownx.slugs.slugify
        kwds:
          case: lower
  - pymdownx.tasklist:
      custom_checkbox: true
  - pymdownx.tilde

# Copyright
copyright: Copyright &copy; 2024 NDF Studio Team
EOF

echo -e "${GREEN}✅ Configuration updated!${NC}"
echo ""

echo -e "${YELLOW}Step 4: CNAME Configuration${NC}"
echo "In your DNS provider for nodebook.in, add:"
echo "Type: CNAME"
echo "Name: docs"
echo "Value: nodebook-docs.github.io"
echo "TTL: 3600"
echo ""

echo -e "${YELLOW}Step 5: Deploy documentation${NC}"
echo "Building and deploying documentation..."

# Build documentation
bash scripts/build_docs.sh

# Deploy to the new repository
cd docs/site
git init
git config user.name "Documentation Deployer"
git config user.email "deploy@nodebook.org"
git add .
git commit -m "Initial documentation deployment"
git branch -M main
git remote add origin https://github.com/nodebook-docs/nodebook-docs.github.io.git
git push -f origin main

echo -e "${GREEN}✅ Documentation deployed successfully!${NC}"
echo ""

echo -e "${BLUE}🎉 Setup Complete!${NC}"
echo ""
echo -e "${GREEN}Your documentation will be available at:${NC}"
echo -e "${BLUE}https://docs.nodebook.in${NC}"
echo -e "${BLUE}https://nodebook-docs.github.io${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Wait for DNS propagation (24-48 hours)"
echo "2. Go to https://github.com/nodebook-docs/nodebook-docs.github.io/settings/pages"
echo "3. Add custom domain: docs.nodebook.in"
echo "4. Check 'Enforce HTTPS'"
echo ""
echo -e "${GREEN}✨ All done! Your documentation is live!${NC}" 