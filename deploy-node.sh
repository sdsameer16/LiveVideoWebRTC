#!/bin/bash

echo "🚀 Starting Node.js deployment for Live Video Calling App..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16 or higher."
    exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js version: $NODE_VERSION"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm version: $NPM_VERSION"
echo

# Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2 globally..."
    npm install -g pm2
fi

PM2_VERSION=$(pm2 -v)
echo "✅ PM2 version: $PM2_VERSION"
echo

# Function to install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."

    # Server dependencies
    echo "   🔧 Installing server dependencies..."
    cd server && npm ci && cd ..

    # Caretaker dependencies
    echo "   🎨 Installing Caretaker dependencies..."
    cd Caretaker && npm ci && cd ..

    # Parent dependencies
    echo "   👨‍👩‍👧‍👦 Installing Parent dependencies..."
    cd parent && npm ci && cd ..

    echo "✅ All dependencies installed"
}

# Function to build frontend applications
build_frontends() {
    echo "🔨 Building frontend applications..."

    # Build Caretaker frontend
    echo "   🎨 Building Caretaker frontend..."
    cd Caretaker && npm run build && cd ..

    # Build Parent frontend
    echo "   👨‍👩‍👧‍👦 Building Parent frontend..."
    cd parent && npm run build && cd ..

    echo "✅ All frontends built"
}

# Function to start applications
start_applications() {
    echo "🚀 Starting applications with PM2..."

    # Start all applications using PM2
    pm2 start ecosystem.config.js

    # Save PM2 configuration
    pm2 save

    echo "✅ All applications started"
    echo
    echo "📊 PM2 Status:"
    pm2 list
    echo
    echo "🔗 Application URLs:"
    echo "   Server API: http://localhost:4000"
    echo "   Caretaker Interface: http://localhost:3001"
    echo "   Parent Interface: http://localhost:3002"
    echo
    echo "📋 Useful PM2 commands:"
    echo "   pm2 logs          - View all logs"
    echo "   pm2 monit         - Monitor processes"
    echo "   pm2 restart all   - Restart all processes"
    echo "   pm2 stop all      - Stop all processes"
    echo "   pm2 delete all    - Delete all processes"
}

# Function to setup environment
setup_environment() {
    if [ ! -f .env ]; then
        echo "⚠️  .env file not found. Creating from template..."
        cp .env.example .env
        echo "✅ Created .env file from template"
        echo "📝 Please edit .env file with your MongoDB credentials!"
    else
        echo "✅ .env file found"
    fi
}

# Main deployment flow
main() {
    setup_environment
    install_dependencies
    build_frontends
    start_applications

    echo
    echo "🎉 Deployment completed successfully!"
    echo "✨ Your Live Video Calling App is now running!"
}

# Run main function
main
