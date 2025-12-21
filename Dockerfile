# Build stage for frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies


RUN npm ci

# Copy source files
COPY . .

# Build the frontend
RUN npm run build

# Build stage for backend
FROM node:20-alpine AS backend-builder

WORKDIR /app/server

# Copy server package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Production stage
FROM node:20-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy backend dependencies and files
COPY --from=backend-builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --chown=nodejs:nodejs server ./server

# Copy frontend build
COPY --from=frontend-builder --chown=nodejs:nodejs /app/dist ./dist

# Copy public assets
COPY --chown=nodejs:nodejs public ./public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3003

USER nodejs

# Expose backend port
EXPOSE 3003

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the backend server
CMD ["node", "server/index.js"]
