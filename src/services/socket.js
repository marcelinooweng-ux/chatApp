import { io } from 'socket.io-client';

// Points to your local Node backend port
export const socket = io('http://localhost:5000', {
  autoConnect: false 
});