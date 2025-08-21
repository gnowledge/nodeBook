# NodeBook Development Roadmap

This document outlines the planned features and development phases for the nodebook-base application. NDF stands for Neighborhood Description Framework.

---

## Phase 1: Foundation and Usability

**Goal:** Solidify the core application, improve the user interface,
  and add essential data management features.

*   **0. Multiple Graph Instances**

*   **Goal:** Allow users to work on multiple, separate graphs within the application.

*   **Key Components:**

*   A top-level UI (e.g., tabs) to switch between graphs.

*   Backend logic to manage separate Hyperbee database instances for each graph.

*   A UI for creating, naming, and deleting graphs.

*   **1. Main Menu & Information Pages**

* **Goal:** Provide users with easy access to key information and
      application settings.

*   **Key Components:**

*   A hamburger menu or vertical-dots icon in the header.

*   A modal or page to display the current graph's sharing keys.

*   An "About" page with application details.

*   A "Help" page that renders markdown for user guidance.

*   A "Preferences" page for future user settings.

*   **2. Data Management CRUD Tabs**

*   **Goal:** Give users a way to view and manage all data entities in a structured, non-visual way.

*   **Key Components:**

*   A new tabbed interface in the main view.

*   A "Nodes" tab with a list of all nodes, allowing for edits or deletion.

*   Tabs for "Node Types", "Relation Types", and "Attribute Types" with full CRUD functionality.

*   **3. Peer Connectivity Tab**

*   **Goal:** Provide visibility into the P2P network status.

*   **Key Components:**

*   A new tab to display information about connected peers.

*   Display peer keys, connection status, and potentially latency.

*   **CNL Editor Enhancements**

*   **Goal:** Make the CNL input a powerful and intuitive editing experience.

*   **Key Components:**

*   **Autocomplete:** Suggest existing node names, relation types, and attribute types as the user types.

*   **Syntax Highlighting:** Integrate an editor like Monaco to provide syntax highlighting for the CNL.

*   **4. Strict Schema Mode**

*   **Goal:** Enforce data integrity by ensuring all created data conforms to the defined schemas.

*   **User Story:** As a graph creator, I want to prevent the creation of relations or attributes that are not defined in my types, to maintain consistency.

*   **Key Components:**

*   A user preference to enable/disable strict mode.

*   Backend validation in the CNL parser and API endpoints to check against the saved RelationType and AttributeType schemas.

---

## Phase 2: Extending the Core Model

**Goal:** Implement the advanced data modeling features from the
  legacy application to enhance the graph's expressive power.

*   **5. Transitions and Functions**

*   **Goal:** Model state changes and derived data as first-class citizens in the graph.

*   **Key Components:**

*   Backend models for `Transition` and `Function` based on `backend/core/models.py`.

*   New API endpoints for CRUD operations on transitions and functions.

*   **CNL Syntax:** Define and implement CNL syntax for creating morphs, transitions (e.g., `transition ionization: [InputNode:morph1] -> [OutputNode:morph2]`), and functions.

*   UI for visualizing transitions and the output of functions.

*   **6. Custom Datatypes**

*   **Goal:** Allow attributes to have rich, structured data beyond simple text or numbers.

*   **Key Components:**

*   Schema definition for new types (e.g., `date-time`, `lat-long-alt`).

*   Update the `AttributeNode` model to support a `datatype` field.

*   Frontend components (e.g., date pickers, maps) in the `NodeCard` for editing these types.

---

## Phase 3: Interoperability and Distribution

**Goal:** Enable data exchange with other systems and package the application for easy distribution.

*   **7. Import/Export**

*   **Goal:** Allow users to import and export their graphs in standard formats.

*   **Key Components:**

*   Backend logic to serialize a graph to `.ndf` (NodeBook Definition File - a JSON-based format) and `.rdf` (Resource Description Framework).

*   Backend logic to parse `.ndf` and `.rdf` files and create the corresponding graph elements.

*   Frontend UI for triggering import and export actions.

*   **8. AppImage Build Scripts**

*   **Goal:** Create a single-file, portable Linux executable for the application.

*   **Key Components:**

*   Scripts to bundle the Node.js backend and the built frontend assets.

*   Configuration for `electron-builder` or a similar tool to package everything into an AppImage.

---

## Phase 9: Advanced Features and Collaboration

**Goal:** Introduce new, high-level features that build on the mature and stable core platform.

*   **10. Peer-to-Peer Chat**

*   **Goal:** Enable real-time collaboration between users connected to the same graph.

*   **Key Components:**

*   A new P2P communication channel (potentially using Hyperswarm topics separate from the graph data).

*   A chat interface component in the frontend.

*   Logic to associate chat messages with specific graphs.

*   **11. Transactions Feature**

*   **Goal:** Introduce a new data model for tracking transactions, similar to personal accounting.

*   **Key Components:**

*   A new `Transaction` model in the backend.

*   API endpoints and database logic for managing transactions.

*   **CNL Syntax:** Define and implement CNL for creating transactions.

*   A dedicated UI for viewing and managing financial-style transactions between nodes.

*   **12. Gamification**

*   **Goal:** Add elements of progression and achievement to the application.

*   **Key Components:**

*   Backend logic for tracking user actions and calculating scores.

*   A "Difficulty Level" system that might unlock features or present challenges.

*   UI elements to display scores and progress.

---

## Next Steps

This roadmap provides a high-level overview. The next step is to break
down the features in **Phase 1** into more detailed user stories and
technical tasks.
