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
  console.log('✅ Caretaker: Connected to server');
});

socket.on('disconnect', () => {
  console.log('❌ Caretaker: Disconnected from server');
});

socket.on('connect_error', (error) => {
  console.error('❌ Caretaker: Connection error:', error.message);
});

export default socket;
