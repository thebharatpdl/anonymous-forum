import io from 'socket.io-client';
import { SOCKET_URL } from '../src/config';

class SocketService {
  constructor() {
    this.socket = null;
    this.userId = null;
    this._queue = [];
  }

  connect(userId) {
    if (this.socket?.connected && this.userId === userId) {
      return this.socket;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('Connecting to socket at:', SOCKET_URL, 'as user:', userId);

    this.userId = userId;

    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('✅ Socket connected, registering user:', userId);
      this.socket.emit('register', userId);

      if (this._queue.length > 0) {
        console.log(`📤 Flushing ${this._queue.length} queued emit(s)`);
        this._queue.forEach(({ event, data }) => {
          this.socket.emit(event, data);
          console.log(`📤 Flushed ${event}:`, data);
        });
        this._queue = [];
      }
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
      this._queue = [];
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
      console.log(`⏳ Queued ${event} (socket not ready):`, data);
      this._queue.push({ event, data });
    }
  }

  on(event, callback) {
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event, callback) {
    if (this.socket) {
      if (callback) {
        this.socket.off(event, callback);
      } else {
        this.socket.off(event);
      }
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

export default new SocketService();