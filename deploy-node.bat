@echo off
echo 🚀 Starting Node.js deployment for Live Video Calling App...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js 16 or higher.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ npm is not installed. Please install npm.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ npm version: %NPM_VERSION%
echo.

REM Create logs directory
echo 📁 Creating logs directory...
if not exist logs mkdir logs

REM Install PM2 globally if not installed
pm2 --version >nul 2>&1
if errorlevel 1 (
    echo 📦 Installing PM2 globally...
    npm install -g pm2
)

for /f "tokens=*" %%i in ('pm2 --version') do set PM2_VERSION=%%i
echo ✅ PM2 version: %PM2_VERSION%
echo.

REM Function to install dependencies
echo 📦 Installing dependencies...

REM Server dependencies
echo    🔧 Installing server dependencies...
cd server
npm ci
cd ..

REM Caretaker dependencies
echo    🎨 Installing Caretaker dependencies...
cd Caretaker
npm ci
cd ..

REM Parent dependencies
echo    👨‍👩‍👧‍👦 Installing Parent dependencies...
cd parent
npm ci
cd ..

echo ✅ All dependencies installed
echo.

REM Function to build frontend applications
echo 🔨 Building frontend applications...

REM Build Caretaker frontend
echo    🎨 Building Caretaker frontend...
cd Caretaker
npm run build
cd ..

REM Build Parent frontend
echo    👨‍👩‍👧‍👦 Building Parent frontend...
cd parent
npm run build
cd ..

echo ✅ All frontends built
echo.

REM Function to setup environment
if not exist .env (
    echo ⚠️  .env file not found. Creating from template...
    copy .env.example .env
    echo ✅ Created .env file from template
    echo 📝 Please edit .env file with your MongoDB credentials!
) else (
    echo ✅ .env file found
)
echo.

REM Function to start applications
echo 🚀 Starting applications with PM2...

REM Start all applications using PM2
pm2 start ecosystem.config.js

REM Save PM2 configuration
pm2 save

echo ✅ All applications started
echo.
echo 📊 PM2 Status:
pm2 list
echo.
echo 🔗 Application URLs:
echo    Server API: http://localhost:4000
echo    Caretaker Interface: http://localhost:3001
echo    Parent Interface: http://localhost:3002
echo.
echo 📋 Useful PM2 commands:
echo    pm2 logs          - View all logs
echo    pm2 monit         - Monitor processes
echo    pm2 restart all   - Restart all processes
echo    pm2 stop all      - Stop all processes
echo    pm2 delete all    - Delete all processes
echo.
echo 🎉 Deployment completed successfully!
echo ✨ Your Live Video Calling App is now running!
pause
