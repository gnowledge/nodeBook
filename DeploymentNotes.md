# Deployment Notes (libp2p-migration)

## Overview

This branch deploys as a path-based stack behind Nginx Proxy Manager (NPM). Keycloak handles auth; frontend uses relative API paths to avoid CORS.

## Prereqs

- VM with Docker + Docker Compose
- Domain with DNS A/AAAA to server IP
- NPM running and listening on :80/:443 (single proxy host for your domain)

## Env

Create `.env.deploy` from templates with at least:
- `DOMAIN_NAME=example.com`
- `KEYCLOAK_ADMIN_USER`, `KEYCLOAK_ADMIN_PASSWORD`
- `KEYCLOAK_CLIENT_ID=nodebook-frontend`, `KEYCLOAK_CLIENT_SECRET=...`
- Optional: `EMAIL_FEATURES_ENABLED=true` and SMTP settings

## Deploy

```bash
./redeploy.sh
```
- Select services to build/start; script passes `.env.deploy` to compose

## Nginx Proxy Manager

Create one Proxy Host for `example.com`:
- SSL: request/renew via NPM (HTTP and HTTPS on 80/443)
- Add Custom Locations:
  - `/` → frontend container:3004 (static serve) or appropriate service/port
  - `/api` → backend container:3000
  - `/auth` → keycloak container:8080
  - `/media` → media-backend container:3001
  - `/nlp` → nlp-service container:3002
  - `/wordnet` → wordnet-service container:3003
- Disable “Block Common Exploits” and “Cache Assets” for Keycloak host if you break admin/static assets

## Keycloak

- Access admin via `https://auth.${DOMAIN_NAME}/admin`
- Configure client `nodebook-frontend` with correct `redirectUris` and `webOrigins` for your domain
- For dev auto-login, keep prod with auth enabled; dev sets `DISABLE_AUTH=true`

## Health

- Frontend: `https://example.com/` should load dashboard
- Auth: login redirects to Keycloak and back
- Public Workspace: accessible without login
- Export/Import: NDF round-trip works (thumbnail present; schemas included for strictgraph)

## Updates

- Pull and rerun `./redeploy.sh`
- For compose-level changes (e.g., env tweaks), rebuild selected services from the script

## Troubleshooting

- SSL conflicts on 443: ensure only NPM binds 80/443
- Keycloak blank admin page: disable NPM caching, set correct `KC_HOSTNAME` envs, ensure `KC_PROXY=edge`
- CORS: frontend uses relative paths; confirm NPM routes and Keycloak client config
- DNS in containers: set Docker’s daemon.json DNS to 1.1.1.1/8.8.8.8 if needed
