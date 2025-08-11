# Developer Notes: NodeBook

This document provides a high-level overview of the NodeBook application's architecture, data flow, and key components. It is intended to help new developers get up to speed with the codebase quickly.

## 1. Overall Architecture

NodeBook is a monolithic application composed of three main parts:

1.  **Backend (`nodebook-base`):** A Node.js server built with Express. It handles all the business logic, data storage, and API endpoints.
2.  **Frontend (`nodebook-base/frontend`):** A React application built with Vite and TypeScript. It provides the user interface for interacting with the application.
3.  **Peer-to-Peer Stack:** The backend uses a suite of technologies from the Hyperstack (`Hypercore`, `Hyperbee`, `Hyperswarm`) to manage the peer-to-peer data replication.

## 2. Data Flow

The primary data flow in the application is as follows:

1.  **User Input:** The user writes Controlled Natural Language (CNL) in the Monaco editor in the frontend.
2.  **API Request:** When the user submits the CNL, the frontend sends a `POST` request to the `/api/graphs/:graphId/cnl` endpoint on the backend.
3.  **CNL Parsing:** The backend's `cnl-parser.js` module takes the new CNL and the old CNL, performs a "diff" to determine what has changed, and generates a series of operations (e.g., `addNode`, `deleteRelation`, `applyFunction`).
4.  **Database Operations:** The `server.js` file iterates through these operations and calls the appropriate methods in `hyper-graph.js` to update the database.
5.  **Data Storage:** The `hyper-graph.js` module uses `Hyperbee`, a key-value store built on top of the `Hypercore` append-only log, to store the graph data.
6.  **UI Updates:** The frontend then refetches the graph data from the `/api/graphs/:graphId/graph` endpoint and re-renders the UI to reflect the changes.

## 3. Key Files & Components

### Backend (`nodebook-base`)

*   **`server.js`:** The main entry point for the backend. It sets up the Express server, defines all the API endpoints, and orchestrates the CNL processing.
*   **`cnl-parser.js`:** This is the most complex part of the application. It is responsible for parsing the CNL and generating the operations to be executed on the graph.
*   **`hyper-graph.js`:** This module is an abstraction layer over the `Hyperbee` database. It provides a high-level API for interacting with the graph data (e.g., `addNode`, `deleteRelation`).
*   **`models.js`:** This file defines the data structures for the different types of nodes in the graph (e.g., `PolyNode`, `RelationNode`).
*   **`schema-manager.js`:** This module is responsible for managing the graph's schemas (node types, relation types, etc.).

### Frontend (`nodebook-base/frontend/src`)

*   **`App.tsx`:** The main component of the frontend. It manages the application's state and renders the different views.
*   **`CnlEditor.tsx`:** The Monaco editor component for writing CNL.
*   **`DataView.tsx`:** The "Nodes" view, which displays the graph data as a grid of cards.
*   **`NodeCard.tsx`:** The component that renders a single node and its attributes and relations.
*   **`SchemaView.tsx`:** The "Schema" view, which allows users to manage the graph's schemas.
*   **`Visualization.tsx`:** The Cytoscape component for visualizing the graph.

## 4. Persistent Bugs & Current State

The application is currently in a state of flux. The recent refactoring of the CNL parser to use a "diff" strategy has introduced several regressions that have not yet been fully resolved.

### Key Issues:

1.  **Function Evaluation:** The `applyFunction` logic is not being correctly triggered, and derived attributes are not being calculated. This is likely due to a flaw in the `diffCnl` function's ability to correctly identify when a function needs to be re-evaluated.
2.  **Relation Creation:** The application is still throwing a "One or both nodes in the relation do not exist" error. This indicates that the two-pass system in `server.js` is not correctly ensuring that all nodes are created before relations are added.
3.  **Deletion Logic:** The "diff" parser is not correctly identifying all deleted items, particularly when a block of text containing multiple nodes and relations is removed.
4.  **Node Context Import:** The "Import Context" feature is not working reliably. It fails to correctly extract the CNL for some nodes, preventing the comparison modal from opening. This is likely due to an issue with the CNL parsing logic in both `graph-manager.js` and `DataView.tsx`. The current string-matching approach is too brittle and needs to be replaced with a more robust parsing strategy.

### Next Steps:

The immediate priority is to fix these persistent bugs. The recommended approach is to continue with the Test-Driven Development (TDD) process that was started. A comprehensive suite of tests for the `cnl-parser.js` module is the best way to ensure that the core logic is correct and to prevent future regressions.