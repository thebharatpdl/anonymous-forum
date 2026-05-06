import io from 'socket.io-client';
import { API_URL } from '../src/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
  }

  connect(userId) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    // Get base URL (remove /api/posts)
    const BASE_URL = API_URL.replace('/api/posts', '');
    console.log('Connecting to socket at:', BASE_URL);
    
    this.socket = io(BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.userId = userId;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected');
      this.socket?.emit('register', userId);
    });

    this.socket.on('registered', (data) => {
      console.log('✅ Registered successfully:', data);
    });

    this.socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
    });

    this.socket.on('connect_error', (error) => {
      console.log('Socket error:', error.message);
    });

    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.userId = null;
    }
  }

  getSocket() {
    return this.socket;
  }

  emit(event, data) {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
      console.log(`📤 Emitted ${event}:`, data);
    } else {
      console.log(`⚠️ Socket not connected, cannot emit ${event}`);
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
      console.log(`📡 Listening for ${event}`);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
      console.log(`🔇 Stopped listening for ${event}`);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();