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

# Set development environment
ENV NODE_ENV=development
ENV PORT=3002

# Expose port
EXPOSE 3002

# Default command
CMD ["node", "server.js"]
