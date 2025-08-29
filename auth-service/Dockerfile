# NodeBook Authentication Service Dockerfile

FROM node:22-alpine

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p user_data

# Set permissions
RUN chmod -R 755 user_data

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3005/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start authentication service
CMD ["node", "server.js"]
