# NodeBook NestJS Migration

This document describes the migration of NodeBook backend from Fastify to NestJS with Swagger integration.

## Overview

The NodeBook backend has been migrated from a custom Fastify implementation to NestJS, providing:

- **Better Architecture**: Modular structure with clear separation of concerns
- **API Documentation**: Automatic Swagger/OpenAPI documentation
- **Type Safety**: Full TypeScript support with decorators and validation
- **Developer Experience**: Better tooling and debugging capabilities
- **Scalability**: Easier to maintain and extend

## Project Structure

```
src/
├── main.ts                 # Application entry point
├── app.module.ts          # Root module
├── app.controller.ts      # Root controller
├── app.service.ts         # Root service
├── auth/                  # Authentication module
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/
│   ├── guards/
│   └── strategies/
├── graph/                 # Graph management module
│   ├── graph.module.ts
│   ├── graph.controller.ts
│   ├── graph.service.ts
│   ├── dto/
│   └── services/
├── schema/                # Schema management module
│   ├── schema.module.ts
│   ├── schema.controller.ts
│   ├── schema.service.ts
│   └── dto/
├── scientific/            # Scientific library module
│   ├── scientific.module.ts
│   ├── scientific.controller.ts
│   └── scientific.service.ts
├── media/                 # Media management module
│   ├── media.module.ts
│   ├── media.controller.ts
│   └── media.service.ts
├── collaboration/         # P2P collaboration module
│   ├── collaboration.module.ts
│   ├── collaboration.controller.ts
│   └── collaboration.service.ts
├── version-control/       # Version control module
│   ├── version-control.module.ts
│   ├── version-control.controller.ts
│   └── version-control.service.ts
└── health/               # Health check module
    ├── health.module.ts
    ├── health.controller.ts
    └── health.service.ts
```

## Key Features

### 1. Swagger Documentation

- **URL**: `http://localhost:3000/api/docs`
- **Features**: Interactive API documentation with authentication support
- **Authentication**: Bearer token support for testing protected endpoints

### 2. Authentication

- **Keycloak Integration**: Full OAuth2/OIDC support
- **Development Mode**: Bypass authentication with `DISABLE_AUTH=true`
- **JWT Strategy**: Secure token-based authentication
- **Guards**: Route-level authentication protection

### 3. API Endpoints

All existing API endpoints have been preserved with the same paths:

- `GET /api/health` - Health check
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `GET /api/graphs` - List user graphs
- `POST /api/graphs` - Create new graph
- `GET /api/graphs/:id/graph` - Get graph data
- `POST /api/graphs/:id/cnl` - Process CNL
- And many more...

### 4. Data Validation

- **DTOs**: Request/response validation using class-validator
- **Transform**: Automatic data transformation with class-transformer
- **Error Handling**: Consistent error responses

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Docker (for containerized development)

### Running the Application

#### Development Mode (NestJS)

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or using Docker
docker-compose -f docker-compose-p2p-dev.yml up nodebook-p2p
```

#### Legacy Mode (Fastify)

```bash
# Start legacy server
npm run start:legacy

# Or using Docker with legacy configuration
docker-compose -f docker-compose-p2p-dev.yml up nodebook-p2p-legacy
```

### Environment Variables

```env
# Authentication
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=nodebook
KEYCLOAK_CLIENT_ID=nodebook-frontend
KEYCLOAK_CLIENT_SECRET=nodebook-frontend-secret
DISABLE_AUTH=true

# Data
DATA_PATH=./user_data

# JWT
JWT_SECRET=nodebook-secret

# Email (optional)
EMAIL_FEATURES_ENABLED=false
```

## Migration Status

### ✅ Completed

- [x] NestJS project setup
- [x] Swagger integration
- [x] Authentication module with Keycloak
- [x] Graph management module
- [x] Schema management module
- [x] Scientific library module
- [x] Health check module
- [x] Docker configuration
- [x] Basic service wrappers

### 🚧 In Progress

- [ ] Full service implementation
- [ ] Error handling improvements
- [ ] Testing suite
- [ ] Performance optimization

### 📋 Pending

- [ ] Media management (temporarily suspended)
- [ ] Collaboration features (P2P)
- [ ] Version control (Git integration)
- [ ] WebSocket support
- [ ] File upload handling

## API Documentation

Once the server is running, visit `http://localhost:3000/api/docs` to explore the interactive API documentation.

### Authentication

To test protected endpoints:

1. Go to the Swagger UI
2. Click "Authorize" button
3. For development mode, use any token (authentication is bypassed)
4. For production mode, use a valid JWT token from Keycloak

## Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure port 3000 is available
2. **Dependencies**: Run `npm install` to install all dependencies
3. **TypeScript errors**: Run `npm run build` to check for compilation errors
4. **Docker issues**: Ensure Docker is running and ports are not in use

### Logs

```bash
# View application logs
docker-compose -f docker-compose-p2p-dev.yml logs nodebook-p2p

# Follow logs in real-time
docker-compose -f docker-compose-p2p-dev.yml logs -f nodebook-p2p
```

## Next Steps

1. **Test the migration**: Verify all endpoints work correctly
2. **Implement missing services**: Complete the placeholder implementations
3. **Add tests**: Create comprehensive test suite
4. **Performance tuning**: Optimize for production use
5. **Documentation**: Update API documentation and user guides

## Support

For issues or questions about the NestJS migration:

1. Check the logs for error messages
2. Verify environment variables are set correctly
3. Ensure all dependencies are installed
4. Check the Swagger documentation for API details

