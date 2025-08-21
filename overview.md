# Project Overview

This project, NodeBook, is a peer-to-peer, collaborative graph authoring environment. It allows users to build and share complex knowledge graphs using a simple, markdown-inspired Controlled Natural Language (CNL).

The project is a monorepo containing:
- A **backend** built with Node.js and Express, which manages the graph data, peer-to-peer collaboration, and serves the frontend.
- A **frontend** built with React, Vite, and TypeScript, which provides the user interface for interacting with the graph.
- An **Electron** application that wraps the frontend and backend to provide a cross-platform desktop experience.

The core of the collaboration functionality is built on a peer-to-peer stack using `hypercore`, `hyperbee`, and `hyperswarm`.

# Building and Running

## Backend

To run the backend server:

```bash
cd nodebook-base
npm install
npm start
```

The backend will be available at `http://localhost:3000`.

## Frontend

To run the frontend development server:

```bash
cd nodebook-base/frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## Electron App

To run the application in an Electron window:

```bash
cd electron
npm install
npm start
```

To build the Electron application for distribution:

```bash
cd electron
npm run dist
```

# Development Conventions

## Coding Style

- The backend uses standard JavaScript with CommonJS modules.
- The frontend uses TypeScript and React with functional components and hooks.
- Linting is enforced on the frontend using ESLint. To run the linter:
  ```bash
  cd nodebook-base/frontend
  npm run lint
  ```

## Testing

There are no dedicated test scripts in the `package.json` files, but there are `.test.js` files in the `nodebook-base` directory, suggesting that tests are written with a framework like Jest or Mocha. To run tests, you may need to install a test runner and configure it.

## Contribution

The `README.md` provides a good starting point for understanding the project. The `cnl-parsing.md` and `transition-model.md` files provide more in-depth information about the CNL and the transition model.
