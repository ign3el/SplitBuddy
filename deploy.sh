#!/bin/bash

# SplitBuddy VPS Deployment Script
# Usage: ./deploy.sh
#
# 🔐 SECURITY NOTE:
# This script pulls code from Git but NEVER touches your .env file.
# Your database credentials and secrets remain safe on the VPS.
# The .env file is in .gitignore and stays local to your server.

set -e  # Exit on error

echo "🚀 Starting SplitBuddy deployment..."

# Configuration
REPO_DIR="/var/www/splitbuddy"
FRONTEND_BUILD_DIR="$REPO_DIR/dist"
FRONTEND_DEPLOY_DIR="/var/www/splitbuddy/frontend"
BACKEND_DIR="$REPO_DIR/server"
PM2_APP_NAME="splitbuddy-backend"

# Navigate to repo directory
cd "$REPO_DIR"

# Pull latest code from Git
echo "📥 Pulling latest code from Git..."
git pull origin main

# Install root dependencies (frontend)
echo "📦 Installing frontend dependencies..."
npm install

# Build frontend
echo "🔨 Building frontend..."
npm run build

# Deploy frontend build
echo "📂 Deploying frontend to $FRONTEND_DEPLOY_DIR..."
rm -rf "$FRONTEND_DEPLOY_DIR"
mkdir -p "$FRONTEND_DEPLOY_DIR"
cp -r "$FRONTEND_BUILD_DIR"/* "$FRONTEND_DEPLOY_DIR/"

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install

# Restart backend with PM2
echo "🔄 Restarting backend with PM2..."
if pm2 list | grep -q "$PM2_APP_NAME"; then
    pm2 restart "$PM2_APP_NAME"
else
    pm2 start index.js --name "$PM2_APP_NAME" --cwd "$BACKEND_DIR"
fi

# Save PM2 process list
pm2 save

echo "✅ Deployment complete!"
echo ""
echo "Frontend: https://www.splitbuddy.ign3el.com"
echo "Backend: https://api.splitbuddy.ign3el.com"
echo ""
echo "Check backend logs: pm2 logs $PM2_APP_NAME"
