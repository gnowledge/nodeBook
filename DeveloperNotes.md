# Developer Notes (libp2p-migration)

This branch stabilizes a file-system-backed NodeBook with production-ready auth, public graphs, NDF packaging, and editor/UX improvements. The next branch will introduce libp2p by implementing a new DataStore that preserves current REST APIs and UI/UX.

## Core services

- Backend: `nodebook-base/server.js` (Fastify). Auth via Keycloak (OIDC + PKCE). File-system DataStore in `nodebook-base/data-store.js`.
- Frontend: `nodebook-base/frontend` (React + Vite). Relative API paths in prod; Vite dev server in dev.
- Media backend: `media-backend/` for uploads; frontend uses `VITE_MEDIA_BACKEND_URL`.
- NLP and WordNet services: optional helpers (prototyping/suggestions), routed by Nginx Proxy Manager in prod.

## DataStore contract (current: FileSystem)

The DataStore factory returns an implementation (file-system now, libp2p next) exposing:
- Graph: `getGraph`, `saveGraph`, `getCnl`, `saveCnl`, `deleteGraph`, `listGraphs`
- Manifest/version: `getManifest`, `saveManifest`, `updateManifest`, Git commit helpers
- Registries: `getGraphRegistry`, `updateGraphRegistry`, `getNodeRegistry`, `saveNodeRegistry`
- CNL regeneration: `regenerateGraphFromCnl(userId, graphId, cnlText)`

File-system paths (via `DATA_PATH`, default `./user_data` in backend container):
- User graphs: `users/<uid>/graphs/<graphId>/{graph.json, graph.cnl, manifest.json, preview.*}`
- Registries: `users/<uid>/{registry.json, node_registry.json}`
- Schemas (strictgraph): `schemas/*.json`

## Public graphs

- Graphs listed public if `publication_state: 'Public'` in registry
- Public endpoints read from the owner’s storage; if `graph.json` is missing but `graph.cnl` exists, backend parses on-the-fly
- `PublicWorkspace` renders read-only Graph/CNL/JSON tabs

## Graph modes

- `markdown`: DataView renders a single document (headings + description blocks)
- `mindmap`: minimal relation labels (single transitive map)
- `richgraph`: concept map with named relations and attributes
- `strictgraph`: validates CNL against `schemas/*.json` during parse

## Editor UX

- Unified toolbar (menu with: version control, mode switch, tools, collaboration toggle)
- Icon-only undo/redo and modification status; docked markdown toolbar
- Keyboard shortcuts (bold, italic, link, list, blockquote, inline code)
- Line wrapping enabled for description blocks

## Cytoscape styles

- Nodes (`polynode`): round-rectangle, autosized to label
- Attribute values (`attribute_value`): rectangle (sharp) for visual distinction
- Subgraph renders attributes as first-class nodes linked via labeled edges

## GraphPreview

- NodeCard can export subgraph SVG and upload to media backend
- Backend stores `preview_url` in graph registry
- Dashboard cards render `preview_url` (full-fit within card)

## NDF export/import

- Export (GET `/api/graphs/:graphId/export?name=...`):
  - Root files: `NDF.MAGIC` (contains "NodeBook NDF v1 (ZIP)") and a thumbnail (from `graph/preview.*` or registry `preview_url`, else fallback SVG)
  - `graph/`: graph folder (includes `.git`)
  - `schemas/`: only when `mode=strictgraph`
- Import (POST `/api/graphs/import`): multipart upload; validates magic; extracts into a new graph id; updates manifest and registry; handles EXDEV (cross-device) by copy+remove fallback

## Dev/prod parity

- Dev stack: `docker-compose-p2p-dev.yml` via `./redev.sh`; ports: frontend 5173, keycloak 8080, media 3001, nlp 3002, wordnet 3003, signaling 4444
- Prod stack: `docker-compose-deploy.yml` via `./redeploy.sh`; no direct ports; Nginx Proxy Manager routes path-based locations
- Frontend uses relative paths in prod to avoid CORS; Keycloak URLs taken from env

## Environment notes

- `DISABLE_AUTH=true` (backend injects dev user for local dev)
- `EMAIL_FEATURES_ENABLED=false` by default
- `MEDIA_BACKEND_INTERNAL_URL` (optional) helps export resolve container-internal hostnames when fetching `preview_url`

## Next: libp2p plan

- Implement `LibP2PStore` with the same DataStore interface
- Keep REST contracts and UI behavior identical
- Ensure NDF semantics remain unchanged
