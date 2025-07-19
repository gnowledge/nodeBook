![nodeBook logo](users/static/nodebook.png)

# Node Book Backend Documentation

Welcome to the comprehensive documentation for the Node Book backend API and implementation. 

The documentation is generated dynamically.  For direct access to the source code of the project, please visit https://github.com/gnowledge/nodeBook 

## 🚀 Quick Start

Node Book is designed based on a model of knowledge,
**Node-neighborhood Description Framework (NDF)** that provides a
comprehensive model for creating and managing graph-based knowledge
representation of things, concepts, events, processes and functions in
terms of describing relations between them, and their properties
(attributes).

The audience of this documentation is developers and curious
visitors. For end-user documentation, please see the [NodeBook Users](users/index.md) section.

### Key Features

- **Graph Management**: Create, update, and manage complex graph structures
- **Node Operations**: Handle polymorphic nodes with multiple morphs
- **Relation Management**: Define and manage relationships between nodes
- **Authentication**: Secure user management with JWT tokens
- **CNL Parsing**: Natural language processing for graph descriptions

## 📚 Documentation Sections

### NodeBook Users
- **Getting Started**: Introduction to NodeBook for end users
- **Difficulty Levels**: Understanding the progressive learning system
- **User Guide**: Comprehensive guide to using NodeBook features
- **CNL Syntax**: Understanding Controlled Natural Language

### API Reference
- **Core Modules**: Core functionality including models, utilities, and validation
- **Routes**: API endpoints for graph operations, user management, and more

### Development
- **Installation**: Setup instructions for developers

## 🔧 Getting Started

### Prerequisites
- Python 3.8+
- FastAPI
- SQLModel
- spaCy

### Installation
```bash
# Clone the repository
git clone https://github.com/gnowledge/nodeBook.git
cd nodeBook

# Install dependencies
pip install -r backend/requirements.txt

# Run the development server
bash scripts/start_backend.sh
```

### API Access
Once running, you can access:
- **API Documentation**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

## 🏗️ Architecture Overview

NDF Studio backend is built with:
- **FastAPI**: Modern, fast web framework
- **SQLModel**: SQL databases in Python, designed for compatibility with both SQLAlchemy Core and Pydantic
- **Pydantic**: Data validation using Python type annotations
- **JWT**: Secure authentication with inactivity-based token expiration

## 📖 API Examples

### Creating a Graph
```python
import requests

# Create a new graph
response = requests.post(
    "http://localhost:8000/api/ndf/users/{user_id}/graphs/{graph_id}",
    json={
        "title": "My Knowledge Graph",
        "description": "A graph representing domain knowledge"
    }
)
```

### Parsing CNL
```python
# Parse CNL (Controlled Natural Language) into graph structure
with open("graph.cnl", "rb") as f:
    response = requests.post(
        "http://localhost:8000/api/ndf/users/{user_id}/graphs/{graph_id}/parse_pipeline",
        files={"file": f}
    )
```

## 🤝 Contributing

We welcome contributions! Please see our [Installation Guide](development/installation.md) for setup instructions.

## 📄 License

This project is licensed under  Affero GPL 3.0 [LICENSE](https://github.com/gnowledge/nodeBook/blob/main/LICENSE) file for details.
