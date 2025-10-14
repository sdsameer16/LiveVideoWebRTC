#!/bin/bash

# Deployment script for Live Video Calling App
echo "🚀 Starting deployment..."

# Build and start all services
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "📊 Checking service status..."
docker-compose ps

echo "✅ Deployment completed!"
echo ""
echo "🔗 Access your application:"
echo "   Server API: http://localhost:4000"
echo "   Caretaker Interface: http://localhost:3001"
echo "   Parent Interface: http://localhost:3002"
echo ""
echo "📝 Make sure to update your .env file with proper MongoDB credentials before running!"
