#!/bin/bash

# Exit on error
set -e

echo "Starting deployment..."

# Pull latest changes
echo "Pulling latest changes..."
git pull origin main

# Install and build frontend
echo "Setting up frontend..."
cd frontend
npm install
npm run build
cd ..

# Install backend dependencies
echo "Setting up backend..."
cd backend
npm install
cd ..

# Check if PM2 processes exist
if pm2 list | grep -q "pooldegens-frontend\|pooldegens-backend"; then
    echo "Reloading PM2 processes..."
    pm2 reload ecosystem.config.js --env production
else
    echo "Starting PM2 processes..."
    pm2 start ecosystem.config.js --env production
fi

# Save PM2 process list
pm2 save

echo "Deployment completed successfully!"

# Health checks
echo "Performing health checks..."

# Wait for services to start
sleep 5

# Check frontend
if curl -s -I https://admin.pooldegens.com | grep -q "200 OK"; then
    echo "Frontend is running"
else
    echo "Warning: Frontend health check failed"
fi

# Check backend
if curl -s -I https://admin.pooldegens.com/api/user_scores/count | grep -q "200 OK"; then
    echo "Backend is running"
else
    echo "Warning: Backend health check failed"
fi

# Check PM2 status
echo "PM2 process status:"
pm2 status

echo "Deployment script completed!"
