# NodeBook (Peer-to-Peer NDF Studio)

This is a peer-to-peer, collaborative graph authoring environment based on the Neighborhood Description Framework (NDF). It allows users to build and share complex knowledge graphs using a simple, markdown-inspired Controlled Natural Language (CNL).

## Project Structure

- `/nodebook-base`: Contains the core backend logic (Node.js, Express, Hyperbee) and the frontend application.
  - `/nodebook-base/server.js`: The main backend server.
  - `/nodebook-base/frontend`: The frontend application (React, Vite, Cytoscape.js).
- `/scripts`: Contains helper scripts for starting and managing the application.
- `/graph_data`: Contains schema definitions for the graph.

## Quick Start

### 1. Environment Setup (Recommended)

To ensure you are using the correct version of Node.js, it is recommended to use [nvm](https://github.com/nvm-sh/nvm).

Once you have `nvm` installed, you can run the following command in the project root to automatically switch to the correct Node.js version:

```bash
nvm use
```

### 2. Install Dependencies

You need to install dependencies for both the backend server and the frontend application.

**Backend:**
```bash
cd nodebook-base
npm install
```

**Frontend:**
```bash
cd nodebook-base/frontend
npm install
```

### 3. Run the Application

Use the provided scripts to start the backend and frontend servers. It is recommended to run them in separate terminal windows.

**Start the Backend:**
```bash
./scripts/start_backend.sh
```

**Start the Frontend:**
```bash
./scripts/start_frontend.sh
```

Once running, you can access the application in your browser, typically at `http://localhost:5173`.

## How to Use

The primary way to interact with the graph is through the CNL (Controlled Natural Language) input panel.

- **Define a Node:** Use a markdown heading (`# Node Name`).
- **Define a Relation:** `<relation name> Target Node Name`
- **Define an Attribute:** `has attribute name: value`
- **Define a Unit:** `has attribute name: value *unit*`
- **Add a Description:** Use a fenced code block with the `description` tag.

### Example

```cnl
# India
<is a> Country
<located in> Asia
has population: 1.4 *billion*

```description
India is a country in South Asia.
```
```