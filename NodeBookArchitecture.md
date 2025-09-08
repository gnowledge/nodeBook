# NodeBook Architecture (libp2p-migration)

## High-level

NodeBook comprises a web frontend, a Fastify backend, and auxiliary services (media, NLP, WordNet). Authentication is delegated to Keycloak. Storage currently uses a file-system DataStore; a libp2p-backed DataStore will be introduced next while preserving APIs.

```
[Frontend (React/Vite)]  <--->  [Backend (Fastify)]  <--->  [FileSystem DataStore]
          |                               |                  
          |                               |--->  [Git (per-graph repo)]
          |                               |--->  [Media Backend]
          |                               |--->  [NLP / WordNet]
          \--> [Keycloak Auth]
```

## Backend responsibilities

- Auth middleware (Keycloak token verification; dev bypass with `DISABLE_AUTH`)
- Graph CRUD and CNL processing
- Public graph APIs (read-only)
- Mode management (`markdown`, `mindmap`, `richgraph`, `strictgraph`)
- Registries (graph and node)
- NDF export/import (ZIP with magic, thumbnail, graph folder, optional schemas)

## Frontend responsibilities

- Dashboard (graphs, public list, GraphPreview)
- Workspace (Graph visualization, NodeCards, CNL editor, JSON view)
- PublicWorkspace (read-only)
- Editor UX (toolbar, shortcuts, markdown tools, line wrap)
- Media Library (upload, preview SVG/PNG/JPG, copy usage snippets)

## Data model

- Nodes (polynode), Relations, Attributes (first-class)
- Manifests per graph (metadata, mode, commit info/version)
- Graph and node registries per user
- Global schemas for StrictGraph

## NDF package format

- Container: standard ZIP
- Root:
  - `NDF.MAGIC` (text: `NodeBook NDF v1 (ZIP)`)
  - `thumbnail.svg|png|jpg`
- `graph/`: entire graph directory (including `.git`)
- `schemas/`: present only for `strictgraph`

## Path-based routing (prod)

- Nginx Proxy Manager fronts services on one domain; custom locations:
  - `/` → frontend
  - `/api` → backend
  - `/auth` → Keycloak
  - `/media` → media backend
  - `/nlp` → NLP
  - `/wordnet` → WordNet

## Libp2p migration plan

- Implement `LibP2PStore` with the same method signatures as FileSystemStore
- Keep REST endpoints unchanged; UI remains source-of-truth for behavior
- Ensure NDF format and import/export logic remain consistent
- Add smoke tests to validate parity between FileSystem and LibP2P implementations
