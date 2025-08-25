![NodeBook Logo](logo.png)

# About NodeBook

## 🚀 **What is NodeBook?**

NodeBook is a **peer-to-peer, collaborative graph authoring tool** that enables users to create, share, and explore knowledge graphs using Controlled Natural Language (CNL). It's designed to make graph creation accessible to both beginners and advanced users through multiple modes and intuitive interfaces.

## 🎯 **Key Features**

- **Multiple Graph Modes**: From simple MindMaps to complex TransitionMaps
- **CNL Interface**: Write graph definitions in natural language
- **Real-time Collaboration**: Peer-to-peer sharing and editing
- **Schema-driven**: Flexible schema system with strict/non-strict modes
- **Cross-platform**: Web-based with Electron desktop support
- **Federated Architecture**: Distributed graph storage and sharing

## 🏗️ **Architecture**

NodeBook is built with a modern, federated architecture:

- **Frontend**: React + TypeScript + Vite
- **Backend**: Fastify + SQLite
- **Graph Engine**: Custom hypergraph implementation
- **Storage**: LevelDB with user data segregation
- **Authentication**: JWT-based user management
- **Publishing**: Multi-level publication system (Private/P2P/Public)

## 🔧 **Technology Stack**

- **Frontend**: React 18, TypeScript, Vite, CSS Modules
- **Backend**: Node.js, Fastify, SQLite
- **Database**: LevelDB, SQLite
- **Graph Visualization**: Cytoscape.js, DAGRE layout
- **Build Tools**: Vite, Electron (desktop)
- **Deployment**: Docker, Nginx, SSL

## 📚 **Graph Modes**

### **MindMap Mode** 🧠
- **Purpose**: Beginner-friendly hierarchical organization
- **Syntax**: Simple headings with optional descriptions
- **Use Case**: Brainstorming, note-taking, simple hierarchies

### **ConceptMap Mode** 💡
- **Purpose**: Concept relationships and connections
- **Syntax**: Enhanced CNL with explicit relations
- **Use Case**: Educational content, knowledge mapping

### **TransitionMap Mode** ⚡
- **Purpose**: Process flows and state changes
- **Syntax**: Prior state → Transition → Post state
- **Use Case**: Workflows, chemical reactions, business processes

### **FunctionMap Mode** ⚙️
- **Purpose**: Computational relationships and derived values
- **Syntax**: Functions with expressions and scopes
- **Use Case**: Mathematical models, scientific calculations

## 🌟 **Join the Development Team!**

We're actively seeking **collaborators and co-authors** to help evolve NodeBook into a comprehensive knowledge graph platform.

### **What We're Looking For:**

- **Frontend Developers**: React, TypeScript, UI/UX expertise
- **Backend Developers**: Node.js, Fastify, database design
- **Graph Theorists**: Knowledge representation, ontology design
- **CNL Specialists**: Natural language processing, syntax design
- **DevOps Engineers**: Docker, deployment, CI/CD
- **Documentation Writers**: Technical writing, user guides
- **Testers**: Quality assurance, user experience testing

### **How to Contribute:**

1. **Fork the Repository**: [GitHub Repository](https://github.com/gnowledge/nodeBook)
2. **Join Discussions**: Open issues, propose features
3. **Submit PRs**: Code improvements, bug fixes, new features
4. **Share Ideas**: Suggest new graph modes, CNL syntax
5. **Test & Report**: Use the tool and report issues

### **Areas for Development:**

- **New Graph Modes**: Timeline, Geographic, Network analysis
- **Enhanced CNL**: More natural language patterns
- **Advanced Visualizations**: 3D graphs, interactive layouts
- **Collaboration Features**: Real-time editing, version control
- **Integration APIs**: Export/import to other tools
- **Mobile Support**: Progressive web app, native mobile

## 📖 **Documentation**

- **User Guide**: [Help Documentation](./Help.md)
- **CNL Reference**: [CNL Syntax Guide](./CNL-Help.md)
- **Schema Guide**: [Schema Definition Guide](./Schema-Guide.md)
- **Developer Notes**: [Technical Documentation](./Developer-Notes.md)
- **API Reference**: [Backend API Documentation](./API-Reference.md)

## 🔗 **Links**

- **Source Code**: [GitHub Repository](https://github.com/gnowledge/nodeBook)
- **Issues**: [GitHub Issues](https://github.com/gnowledge/nodeBook/issues)
- **Discussions**: [GitHub Discussions](https://github.com/gnowledge/nodeBook/discussions)
- **Releases**: [GitHub Releases](https://github.com/gnowledge/nodeBook/releases)

## 📄 **License**

NodeBook is open source software. See the [LICENSE](https://github.com/gnowledge/nodeBook/blob/main/LICENSE) file for details.

## 🙏 **Acknowledgments**

- **Gnowledge Lab**: Research and development support
- **Open Source Community**: Libraries and tools that make this possible
- **Early Adopters**: Users who provided feedback and testing
- **Contributors**: Everyone who has helped shape NodeBook

---

**Ready to contribute?** Start by exploring the codebase, trying out the tool, and joining our community discussions. Every contribution, no matter how small, helps make NodeBook better for everyone!

**Contact**: Open an issue on GitHub or join our discussions to get started.
