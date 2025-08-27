# Multi-stage build for NodeBook Base Service
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    musl-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build frontend
WORKDIR /app/frontend
RUN npm ci
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype

# Create app user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodebook -u 1001

# Set working directory
WORKDIR /app

# Copy built application from base stage
COPY --from=base --chown=nodebook:nodejs /app ./

# Create necessary directories
RUN mkdir -p user_data logs media && \
    chown -R nodebook:nodejs user_data logs media

# Switch to non-root user
USER nodebook

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })" || exit 1

# Start the application
CMD ["node", "server.js"]
