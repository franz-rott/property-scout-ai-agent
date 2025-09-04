# Dockerfile
# Use the 'slim' version for better compatibility than 'alpine'
FROM node:18-slim

# Set the working directory
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Expose the ports for the MCP servers
EXPOSE 3001 3002 3003 3004

# The 'command' in docker-compose.yml will determine what runs.
CMD ["node", "dist/index.js"]