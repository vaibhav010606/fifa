# Use official Node.js lightweight image
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and build frontend
COPY . .
RUN npm run build

# Production Stage
FROM node:20-slim

WORKDIR /app

# Copy package json for production install
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the built backend server and frontend dist from the builder
COPY --from=builder /app/server.js ./
COPY --from=builder /app/dist ./dist

# Expose Cloud Run default port
EXPOSE 8080
ENV PORT=8080
ENV NODE_ENV=production

# Start the server
CMD ["npm", "start"]
