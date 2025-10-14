import { io } from 'socket.io-client';

const socket = io('http://localhost:4000', {
  transports: ['websocket', 'polling'], // Fallback to polling if websocket fails
  timeout: 20000,
  forceNew: true,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5,
  maxReconnectionAttempts: 5
});

socket.on('connect', () => {
  console.log('✅ Parent: Connected to server');
});

socket.on('disconnect', () => {
  console.log('❌ Parent: Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Parent: Connection error:', error.message);
});

export default socket;
