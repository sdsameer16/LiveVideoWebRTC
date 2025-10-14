@echo off
echo 🚀 Starting deployment...

REM Stop existing services
docker-compose down

REM Build and start all services
docker-compose build --no-cache
docker-compose up -d

REM Wait for services to start
echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

REM Check service status
echo 📊 Checking service status...
docker-compose ps

echo ✅ Deployment completed!
echo.
echo 🔗 Access your application:
echo    Server API: http://localhost:4000
echo    Caretaker Interface: http://localhost:3001
echo    Parent Interface: http://localhost:3002
echo.
echo 📝 Make sure to update your .env file with proper MongoDB credentials before running!
pause
