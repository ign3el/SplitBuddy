# Docker Setup for SplitBuddy

This document explains how to build and run SplitBuddy using Docker.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

### 1. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.docker.example .env
```

Edit `.env` with your configuration values.

### 2. Build and Run with Docker Compose

Start all services (database, backend, frontend):

```bash
docker-compose up -d
```

This will:
- Create a MySQL database container
- Build and start the backend API server
- Build and start the frontend (served by Nginx)

### 3. Access the Application

- **Frontend**: http://localhost
- **Backend API**: http://localhost:3003
- **Database**: localhost:3306

### 4. Stop Services

```bash
docker-compose down
```

To also remove volumes (database data):

```bash
docker-compose down -v
```

## Individual Docker Builds

### Build Full Stack (Backend + Frontend)

```bash
docker build -t splitbuddy:latest .
```

Run the container:

```bash
docker run -p 3003:3003 \
  -e DB_HOST=your-db-host \
  -e DB_USER=your-db-user \
  -e DB_PASSWORD=your-db-password \
  -e DB_NAME=splitbuddy \
  -e JWT_SECRET=your-secret \
  splitbuddy:latest
```

### Build Frontend Only

```bash
docker build -f Dockerfile.frontend -t splitbuddy-frontend:latest .
```

Run the container:

```bash
docker run -p 80:80 splitbuddy-frontend:latest
```

## Docker Compose Commands

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

### Execute Commands in Container

```bash
# Access backend shell
docker-compose exec backend sh

# Access database
docker-compose exec db mysql -u splitbuddy -p splitbuddy
```

## Production Deployment

### Build for Production

```bash
# Build optimized images
docker-compose -f docker-compose.yml build --no-cache

# Tag images for registry
docker tag splitbuddy-backend:latest your-registry/splitbuddy-backend:v1.0.0
docker tag splitbuddy-frontend:latest your-registry/splitbuddy-frontend:v1.0.0

# Push to registry
docker push your-registry/splitbuddy-backend:v1.0.0
docker push your-registry/splitbuddy-frontend:v1.0.0
```

### Environment Variables for Production

Make sure to set secure values for:
- `DB_ROOT_PASSWORD`
- `DB_PASSWORD`
- `JWT_SECRET`

### Health Checks

The MySQL service includes health checks. The backend depends on the database being healthy before starting.

## Volumes

- `db_data`: Persists MySQL database data

## Network

All services run on a custom bridge network `splitbuddy-network` for inter-container communication.

## Troubleshooting

### Database Connection Issues

```bash
# Check database logs
docker-compose logs db

# Test database connection
docker-compose exec db mysql -u splitbuddy -p
```

### Backend Not Starting

```bash
# Check backend logs
docker-compose logs backend

# Ensure database is healthy
docker-compose ps
```

### Port Already in Use

If port 80 or 3003 is already in use, edit `docker-compose.yml` to use different ports:

```yaml
ports:
  - "8080:80"  # Frontend on port 8080
  - "3004:3003"  # Backend on port 3004
```

## Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│  Frontend   │ (Nginx on port 80)
│  (React)    │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   Backend   │ (Node.js on port 3003)
│   (API)     │
└──────┬──────┘
       │
       ↓
┌─────────────┐
│   MySQL DB  │ (Port 3306)
└─────────────┘
```

## Optimization Tips

1. **Multi-stage builds**: Already implemented to reduce image size
2. **Layer caching**: Dependencies are installed before copying source code
3. **Non-root user**: Containers run as non-root user for security
4. **Health checks**: Database has health checks for reliable startup
5. **Gzip compression**: Nginx compresses static assets
6. **Static asset caching**: Proper cache headers for frontend assets

## Development with Docker

For development, you might want to mount source code:

```yaml
backend:
  volumes:
    - ./server:/app/server
    - /app/server/node_modules
```

This allows hot-reloading during development.
