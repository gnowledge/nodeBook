FROM node:20

# Install development tools
RUN npm install -g nodemon

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create media data directory
RUN mkdir -p media-data

# Set development environment
ENV NODE_ENV=development
ENV PORT=3001
ENV DATA_PATH=/app/media-data

# Expose port
EXPOSE 3001

# Default command
CMD ["node", "server.js"]
