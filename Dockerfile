# Stage 1: Build the frontend
FROM node:20 AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files and install dependencies
COPY nodebook-base/frontend/package.json nodebook-base/frontend/package-lock.json ./
RUN npm install

# Copy the rest of the frontend source code
COPY nodebook-base/frontend ./

# Build the frontend static assets
RUN npm run build

# Stage 2: Setup the backend production server
FROM node:20-slim

WORKDIR /app

# Set the Node.js environment to production
ENV NODE_ENV=production

# Copy backend package files
COPY nodebook-base/package.json nodebook-base/package-lock.json ./

# Install only production dependencies for the backend
RUN npm install --omit=dev

# Copy the rest of the backend source code
COPY nodebook-base ./

# Copy the built frontend assets from the builder stage
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose the port the server will run on
EXPOSE 3000

# Command to run the application
# The server will be started with a default data path of '/data'
# This path should be mounted as a volume in docker-compose or `docker run`
CMD [ "node", "server.js", "/data" ]
