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

# Create public directory if it doesn't exist and copy frontend files
RUN mkdir -p /app/public
COPY public /app/public

# Expose the main application port and MCP server ports
EXPOSE 3000 3001 3002 3003 3004

# The 'command' in docker-compose.yml will determine what runs.
CMD ["node", "dist/index.js"]