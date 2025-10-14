#!/usr/bin/env node

/**
 * Production Startup Script for Live Video Calling App
 * This script builds and starts all components of the application
 */

import { execSync } from 'child_process';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

console.log('🚀 Starting Live Video Calling App...\n');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  bright: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function execute(command, cwd = process.cwd(), description = '') {
  try {
    if (description) {
      log(`📦 ${description}...`, colors.blue);
    }
    execSync(command, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
    if (description) {
      log(`✅ ${description} completed`, colors.green);
    }
  } catch (error) {
    log(`❌ Error: ${error.message}`, colors.red);
    process.exit(1);
  }
}

// Check if Node.js version is compatible
const nodeVersion = process.version;
log(`📋 Node.js version: ${nodeVersion}`, colors.blue);

// Step 1: Install server dependencies
log('\n📦 Installing server dependencies...', colors.bright);
execute('npm ci', path.join(__dirname, 'server'), 'Server dependencies');

// Step 2: Install Caretaker frontend dependencies
log('\n📦 Installing Caretaker frontend dependencies...', colors.bright);
execute('npm ci', path.join(__dirname, 'Caretaker'), 'Caretaker dependencies');

// Step 3: Install Parent frontend dependencies
log('\n📦 Installing Parent frontend dependencies...', colors.bright);
execute('npm ci', path.join(__dirname, 'parent'), 'Parent dependencies');

// Step 4: Build Caretaker frontend
log('\n🔨 Building Caretaker frontend...', colors.bright);
execute('npm run build', path.join(__dirname, 'Caretaker'), 'Caretaker build');

// Step 5: Build Parent frontend
log('\n🔨 Building Parent frontend...', colors.bright);
execute('npm run build', path.join(__dirname, 'parent'), 'Parent build');

log('\n🎉 Build completed successfully!', colors.green);
log('\n📋 Starting services...', colors.bright);

// Check if PM2 is available, otherwise use a simple startup approach
try {
  // Try to use PM2 if available
  const pm2Status = execSync('npx pm2 list', { encoding: 'utf8' });
  log('📊 PM2 detected, using process manager...', colors.blue);

  // Start server with PM2
  execute('npx pm2 start server/index.js --name "livevideo-server"', __dirname, 'Server process');

  // Start Caretaker frontend
  execute('npx pm2 start "npm run serve" --name "caretaker-app" --cwd Caretaker', __dirname, 'Caretaker process');

  // Start Parent frontend
  execute('npx pm2 start "npm run serve" --name "parent-app" --cwd parent', __dirname, 'Parent process');

  log('\n🚀 All services started with PM2!', colors.green);
  log('📊 Monitor with: npx pm2 monit', colors.blue);
  log('🛑 Stop with: npx pm2 stop all', colors.blue);
  log('📋 Logs with: npx pm2 logs', colors.blue);

} catch (error) {
  log('\n⚠️  PM2 not available, using simple startup...', colors.yellow);

  // Fallback: Start services manually (requires running in background)
  log('\n🔄 Starting services manually...', colors.bright);

  // Start server in background
  execute('node server/index.js', __dirname, 'Server (background)');

  // Note: For manual startup, you'll need to start frontends separately in different terminals
  log('\n📝 Manual startup instructions:', colors.yellow);
  log('Terminal 1 - Server: node server/index.js', colors.blue);
  log('Terminal 2 - Caretaker: cd Caretaker && npm run serve', colors.blue);
  log('Terminal 3 - Parent: cd parent && npm run serve', colors.blue);
}

log('\n🎯 Application URLs:', colors.green);
log(`   Server API: http://localhost:${process.env.PORT || 4000}`, colors.blue);
log(`   Caretaker Interface: http://localhost:${process.env.CARETAKER_PORT || 3001}`, colors.blue);
log(`   Parent Interface: http://localhost:${process.env.PARENT_PORT || 3002}`, colors.blue);

log('\n✨ Deployment completed!', colors.green);
