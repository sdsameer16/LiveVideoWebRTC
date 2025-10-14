# Live Video Calling App

A real-time video calling application for parents to view live streams from caretakers (babysitters/nannies). The app consists of three main components:

- **Server**: Backend API and WebSocket server for signaling and data management
- **Caretaker Interface**: Frontend for caretakers to start live video streams
- **Parent Interface**: Frontend for parents to view live streams

## 🏗️ Project Structure

```
livevideo/
├── server/                 # Backend API (Node.js/Express)
│   ├── index.js           # Main server file
│   └── package.json       # Server dependencies
├── Caretaker/             # Caretaker frontend (React/Vite)
│   ├── src/               # React source code
│   └── package.json       # Frontend dependencies
├── parent/                # Parent frontend (React/Vite)
│   ├── src/               # React source code
│   └── package.json       # Frontend dependencies
├── ecosystem.config.js    # PM2 process configuration
├── start.js              # Production startup script
├── deploy-node.sh        # Linux/Mac deployment script
├── deploy-node.bat       # Windows deployment script
└── README.md             # This file
```

## 🚀 Quick Deployment (Node.js)

### Prerequisites

- **Node.js 16+** installed on your system
- **MongoDB** running (local or remote)
- **Git** (for cloning if needed)

### 1. Environment Setup

Ensure you have a `.env` file in the root directory with your configuration:

```env
NODE_ENV=production
PORT=4000
MONGO_URI=mongodb://localhost:27017/livevideo
CARETAKER_PORT=3001
PARENT_PORT=3002
```

### 2. Deploy with Node.js

**Linux/Mac:**
```bash
./deploy-node.sh
```

**Windows:**
```batch
deploy-node.bat
```

This will:
- Install all dependencies
- Build the React frontend applications
- Start the backend server on port 4000
- Start caretaker interface on port 3001
- Start parent interface on port 3002
- Configure PM2 for process management

### 3. Access the Application

- **Server API**: http://localhost:4000
- **Caretaker Interface**: http://localhost:3001
- **Parent Interface**: http://localhost:3002

## 🐳 Alternative: Docker Deployment

If you prefer Docker deployment, see the Docker section below.

## 🔧 Development Setup

### Running Locally (without deployment scripts)

#### Backend Server

```bash
cd server
npm install
npm run dev  # Runs on http://localhost:4000
```

#### Caretaker Frontend

```bash
cd Caretaker
npm install
npm run dev  # Runs on http://localhost:5173
```

#### Parent Frontend

```bash
cd parent
npm install
npm run dev  # Runs on http://localhost:5174
```

## 📋 Process Management (PM2)

The deployment uses **PM2** for process management:

```bash
# View logs
pm2 logs

# Monitor processes
pm2 monit

# Restart all processes
pm2 restart all

# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all

# View process status
pm2 list
```

## 🛠️ Technology Stack

### Backend (Server)
- **Node.js** with Express.js
- **Socket.IO** for real-time WebRTC signaling
- **MongoDB** for storing video recordings
- **Multer** for file uploads

### Frontend (Caretaker & Parent)
- **React 19** with Vite
- **Socket.IO Client** for real-time communication
- **Simple-Peer** for WebRTC video calling

### DevOps & Deployment
- **PM2** for process management
- **Node.js** for runtime
- **npm** for package management

## 📋 Features

- **Real-time video calling** using WebRTC
- **Room-based connections** for organized streaming
- **Video recording storage** in MongoDB GridFS
- **Responsive UI** for both caretaker and parent interfaces
- **Scalable architecture** with separate services

## 🔒 Security Considerations

- Environment variable management for configuration
- Input validation on API endpoints
- CORS configuration for cross-origin requests

## 🚨 Troubleshooting

### Common Issues

1. **Port conflicts**: Ensure ports 4000, 3001, 3002 are available
2. **MongoDB connection**: Check MongoDB URI in `.env` file
3. **Build failures**: Clear npm cache with `npm cache clean --force`

### Logs

View application logs:
```bash
pm2 logs
```

Or check individual service logs in the `logs/` directory.

## 📝 API Endpoints

- `POST /api/uploadRecording` - Upload video recordings

## 🔄 WebSocket Events

- `join-room` - Join a video room
- `signal` - WebRTC signaling data
- `new-peer` - Notify new participant
- `disconnect` - Handle disconnections

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is private and not licensed for public use.

---

**Note**: This application handles sensitive video content of children. Ensure proper privacy measures and consent are in place before deployment.
