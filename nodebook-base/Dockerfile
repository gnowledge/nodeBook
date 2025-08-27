# Multi-stage build for NodeBook Base Service
FROM node:20-bullseye AS base

# Install system dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    libpixman-1-dev \
    libfreetype6-dev \
    curl \
    build-essential \
    libsodium-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Set environment for native module compilation
ENV NODE_OPTIONS="--max-old-space-size=4096"
ENV npm_config_build_from_source=true

# Copy package files
COPY package*.json ./

# Install dependencies with native module support
RUN npm install --omit=dev

# Copy source code
COPY . .

# Force rebuild of problematic native modules
RUN npm rebuild sodium-native || npm install sodium-native --build-from-source
RUN npm rebuild hyperswarm || npm install hyperswarm --build-from-source
RUN npm rebuild hypercore || npm install hypercore --build-from-source
RUN npm rebuild hyperdrive || npm install hyperdrive --build-from-source
RUN npm rebuild hyperbee || npm install hyperbee --build-from-source

# Build frontend
WORKDIR /app/frontend
RUN npm install
RUN npm run build

# Production stage
FROM node:20-bullseye AS production

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libcairo2 \
    libjpeg62-turbo \
    libpango-1.0-0 \
    libgif7 \
    libpixman-1-0 \
    libfreetype6 \
    && rm -rf /var/lib/apt/lists/*

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
