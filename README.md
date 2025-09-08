# NodeBook

Federated, cross-platform knowledge graph application. This branch (libp2p-migration) runs on a file-system datastore; libp2p integration will land next by implementing the same `DataStore` interface.

## Highlights

- Keycloak authentication (OIDC + PKCE), delegated login/registration/forgot-password
- Public graphs with a read-only Workspace preview (Graph, CNL, JSON tabs)
- Graph Modes: `markdown`, `mindmap`, `richgraph`, `strictgraph`
  - `markdown`: renders document-style DataView
  - `strictgraph`: validates against schemas; NDF export includes `schemas/`
- Editor UX: unified toolbar, markdown shortcuts, line wrapping, docked toolbar
- GraphPreview: set any NodeCard subgraph as dashboard preview; stored via media backend
- Media Library: upload/manage images and use them in Markdown/CNL
- NDF export/import: portable graph package (ZIP with `NDF.MAGIC`, `graph/*`, optional `schemas/`, and a thumbnail)

## Quick start (Development)

Prereqs: Docker, Docker Compose plugin.

1) Configure env
- Create `.env.dev` (or use the provided `env.dev` as a base). Typical dev values:
  - `DISABLE_AUTH=true` (backend injects a dev user; frontend auto-login)
  - `KEYCLOAK_*` for local Keycloak if you want full auth flow

2) Start the dev stack
```bash
./redev.sh
```
Choose services, build, and start. Frontend will be at `http://localhost:5173`.

Notes:
- Dev uses relative API paths in the frontend; Vite proxies to the backend container.
- Keycloak runs at `http://localhost:8080` in dev (configured in the compose).

## Quick start (Deployment)

Prereqs: A VM with Docker + Docker Compose, and Nginx Proxy Manager (NPM) handling ports 80/443 for your domain.

1) Create `.env.deploy` from the templates and set at least:
- `DOMAIN_NAME`, `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET`
- Optional: `EMAIL_FEATURES_ENABLED=true` if SMTP configured

2) Deploy
```bash
./redeploy.sh
```

3) In Nginx Proxy Manager, configure one Proxy Host for the main domain and add path-based locations to route:
- `/` → frontend service
- `/api` → NodeBook backend
- `/auth` → Keycloak
- `/media` → media backend
- `/nlp` → nlp service
- `/wordnet` → wordnet service

## Project layout

```
nodeBook/
├─ docker-compose-p2p-dev.yml      # dev stack
├─ docker-compose-deploy.yml       # deploy stack
├─ redev.sh / redeploy.sh          # interactive helpers
├─ nodebook-base/                  # backend + shared libs
│  ├─ server.js                    # Fastify backend
│  ├─ data-store.js                # DataStore (file-system)
│  ├─ graph-manager.js             # Graph/public APIs
│  └─ frontend/                    # React + Vite UI
├─ media-backend/                  # uploads and serving
├─ nlp-service/, wordnet-service/  # auxiliary services
└─ data/                           # runtime data (prod)
```

## Data model and storage

- Each graph lives at `data/users/<uid>/graphs/<graphId>/` with:
  - `manifest.json`, `graph.json`, `graph.cnl`, optional `preview.svg|png|jpg`
- Registries per user: `data/users/<uid>/registry.json` (graphs), `node_registry.json` (nodes across graphs)
- Global schemas (for `strictgraph`): `data/schemas/*.json`
- Git per-graph repository is initialized to track CNL/graph evolution

## NDF export/import

- Export: Dashboard → GraphCard → Export (NDF)
  - Produces `*.ndf.zip` with marker `NDF.MAGIC`, `graph/` folder (including `.git`), a root thumbnail, and `schemas/` if `strictgraph`
- Import: Dashboard → Import NDF → pick `*.ndf.zip` and name the new graph

## License

AGPL-3.0-only

## Roadmap (libp2p phase)

- Implement a `LibP2PStore` that satisfies `DataStore` to back graphs with libp2p while keeping all current APIs/UX unchanged.