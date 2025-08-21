# Federated NodeBook: A Unified Architecture Plan

This document outlines the strategy for evolving NodeBook into a federated, cross-platform application that supports both centralized server deployments and decentralized desktop use from a single, unified codebase.

## 1. High-Level Strategy

The core strategy is to re-architect the application into a standard client-server model that can be deployed in two distinct ways:

1.  **As a Web Service:** A Docker container running the backend and serving a Progressive Web App (PWA) frontend. This allows users to access NodeBook via any web browser, including on mobile devices.
2.  **As a Desktop App:** An Electron/AppImage package that bundles the *exact same* backend and frontend, running them locally for a seamless offline-first, peer-to-peer experience.

This approach maximizes code reuse, simplifies maintenance, and provides a consistent user experience across all platforms.

## 2. Unified Architecture Overview

The application will always consist of two primary components that communicate via standard web APIs, regardless of the deployment environment.

### Backend (Node.js / Express)

-   **Authentication:** A mandatory authentication layer will be introduced. All access to data will require a valid user session. 
    -   **Recommended Method for Internet Facing Docker Environment:** OAuth (Google, GitHub) for simplicity and security.
    -   **Session Management:** JSON Web Tokens (JWT) will be used to manage user sessions. The token will be passed with every API request.
-   **User-Based Data Segregation:** The backend will no longer use a single, global data directory. Instead, it will create and manage a separate data directory for each registered user. All file and database operations will be strictly contained within the authenticated user's directory.
-   **API Server:** The Express server will expose a formal REST/WebSocket API for all frontend operations (e.g., `GET /api/graph`, `POST /api/node`, etc.).
-   **P2P Federation:** The backend will retain its `hyperswarm` capabilities, allowing one server instance to connect and sync with another server instance as a peer.

### Frontend (React / PWA)

-   **Client-Side Application:** The frontend will be a pure client-side application. It will have no direct access to the file system or Node.js modules.
-   **API Communication:** All data operations will be performed by making API calls to the backend. The frontend will not know or care whether the backend is running on a remote server or on `localhost`.
-   **Progressive Web App (PWA):** The frontend will be enhanced with PWA features:
    -   **Service Worker:** To enable offline caching of the application shell and assets.
    -   **Web App Manifest:** To allow users to "install" the app to their home screen on mobile devices.

## 3. Deployment Scenarios

### Scenario A: Server Deployment (Docker)

This is for schools or organizations that want to host a central NodeBook instance.

-   **Containerization:** A `Dockerfile` will package the Node.js backend and the pre-built static assets of the React frontend (`dist` folder) into a single image.
-   **Orchestration:** A `docker-compose.yml` file will be provided for easy deployment, managing the NodeBook container and any related services (e.g., a reverse proxy).
-   **Function:**
    1.  The Docker container starts the Node.js server.
    2.  The server serves the React PWA to users visiting its public URL.
    3.  Users register and log in, creating their own private userspace on the server's persistent storage volume.
    4.  This server can then be configured to federate (P2P sync) with other NodeBook servers.

### Scenario B: Desktop Deployment (Electron / AppImage)

This is for individual users who want a standalone, offline-capable version.

-   **Packaging:** The Electron build process will bundle the Node.js server and the React PWA assets into a single executable (`.AppImage`, `.exe`).
-   **Function:**
    1.  When the user launches the application, the Electron `main.js` script starts the Node.js server as a background child process on an available local port.
    2.  The Electron `BrowserWindow` is created and pointed to the local server's URL (e.g., `http://localhost:49875`).
    3.  **Auto-Login:** The backend will detect it's running in a local Electron environment. It will bypass the login screen and automatically authenticate a single "local user".
    4.  **Local Data:** The data for this local user will be stored in a standard application data directory on the user's computer (e.g., `~/.config/NodeBook/`).
    5.  The application functions identically to the web version but operates on local data and can participate in the `hyperswarm` network as a full peer.

## 4. Key Implementation Steps

1.  **Implement Authentication:**
    -   Add user model/schema.
    -   Integrate a library like `passport.js` for OAuth/local password strategies.
    -   Implement JWT generation and validation middleware in Express.

2.  **Refactor Backend for Data Segregation:**
    -   Modify all data-access functions (`graph-manager.js`, etc.) to accept a `userId` as a parameter.
    -   Create a utility function that constructs the correct, user-specific data path based on the `userId`.
    -   Ensure all file I/O is scoped to the user's directory.

3.  **Formalize the API:**
    -   Define clear API endpoints for all frontend actions.
    -   Update the frontend to use `fetch` or a similar library for all communication with the backend, removing any direct backend module imports.

4.  **Create Docker Configuration:**
    -   Write a `Dockerfile` to build the production-ready image.
    -   Write a `docker-compose.yml` for simplified deployment.

5.  **Update Electron Wrapper:**
    -   Modify the `main.js` script to manage the lifecycle of the backend child process.
    -   Implement the auto-login logic for the desktop environment.

6.  **Add PWA Features:**
    -   Integrate a tool like `vite-plugin-pwa` to automatically generate the service worker and manifest file.
    -   Configure caching strategies for optimal offline performance.
