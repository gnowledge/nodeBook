# Nginx Proxy Manager Configuration for NodeBook

## Media Service Configuration

The media service requires special nginx configuration to properly strip the `/media` prefix when forwarding requests to the media-backend container.

### Current Issue
- Frontend makes requests to: `https://nodebook.co.in/media/api/media/files`
- Nginx forwards to: `http://media-backend:3001/media/api/media/files`
- Media-backend expects: `http://media-backend:3001/api/media/files`

### Solution: Configure Nginx Proxy Manager

In your Nginx Proxy Manager web interface (port 81), configure the media service location as follows:

#### Custom Location Configuration
- **Location Path**: `/media`
- **Forward Hostname/IP**: `nodebook-media-backend-p2p-dev`
- **Forward Port**: `3001`
- **Forward Scheme**: `http`

#### Advanced Configuration
Add this custom nginx configuration in the "Advanced" tab:

```nginx
location /media/ {
    # Strip the /media prefix and forward to media-backend
    rewrite ^/media/(.*)$ /$1 break;
    proxy_pass http://nodebook-media-backend-p2p-dev:3001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### Alternative: Use Path Rewrite in NPM
If your NPM version supports it, you can also use the "Path Rewrite" feature:
- **Path Rewrite**: `^/media/(.*)$ /$1`

### Complete Proxy Host Configuration
For reference, here's the complete set of custom locations for your domain:

1. **Root** (`/`)
   - Forward to: `nodebook-frontend-p2p-dev:3004`

2. **API** (`/api`)
   - Forward to: `nodebook-p2p-dev:3000`

3. **Auth** (`/auth`)
   - Forward to: `nodebook-keycloak-p2p-dev:8080`

4. **Media** (`/media`)
   - Forward to: `nodebook-media-backend-p2p-dev:3001`
   - **With path rewrite**: `^/media/(.*)$ /$1`

5. **NLP** (`/nlp`)
   - Forward to: `nodebook-nlp-service-p2p-dev:3002`

6. **WordNet** (`/wordnet`)
   - Forward to: `nodebook-wordnet-service-p2p-dev:3005`

### Testing
After applying this configuration:
- Request: `https://nodebook.co.in/media/api/media/files`
- Nginx rewrites to: `http://media-backend:3001/api/media/files`
- Media-backend responds correctly ✅

### Container Names Reference
- Frontend: `nodebook-frontend-p2p-dev`
- Backend: `nodebook-p2p-dev`
- Keycloak: `nodebook-keycloak-p2p-dev`
- Media: `nodebook-media-backend-p2p-dev`
- NLP: `nodebook-nlp-service-p2p-dev`
- WordNet: `nodebook-wordnet-service-p2p-dev`
