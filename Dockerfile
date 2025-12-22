# Stage 1: Frontend Build
FROM node:20-alpine AS frontend-builder
RUN apk add --no-cache git
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . . 
# Add a .dockerignore to exclude /server from this stage if possible
RUN npm run build

# Stage 2: Backend Dependencies
FROM node:20-alpine AS backend-builder
WORKDIR /app
# Specifically copy the server package files
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Stage 3: Production
FROM node:20-alpine AS production
RUN apk add --no-cache dumb-init
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

WORKDIR /app

# 1. Copy dependencies first
COPY --from=backend-builder --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules

# 2. Copy source code (Ensure .dockerignore excludes node_modules)
COPY --chown=nodejs:nodejs server ./server
COPY --from=frontend-builder --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs public ./public

ENV NODE_ENV=production
ENV PORT=3003
USER nodejs
EXPOSE 3003
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server/index.js"]