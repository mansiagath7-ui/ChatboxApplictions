import { io } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';
let socket = null;
let messageReceivedHandler = null;
let userStatusChangedHandler = null;
let messageDeletedHandler = null;

export const socketService = {
  connect: (user) => {
    if (socket) return socket;

    socket = io(SOCKET_URL, {
      pingTimeout: 60000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('Socket client connected:', socket.id);
      socket.emit('setup', user);
    });

    socket.on('messageReceived', (data) => {
      if (messageReceivedHandler) messageReceivedHandler(data);
    });

    socket.on('userStatusChanged', (data) => {
      if (userStatusChangedHandler) userStatusChangedHandler(data);
    });

    socket.on('messageDeleted', (data) => {
      if (messageDeletedHandler) messageDeletedHandler(data);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket client disconnected:', reason);
    });

    return socket;
  },

  disconnect: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      messageReceivedHandler = null;
      userStatusChangedHandler = null;
      messageDeletedHandler = null;
    }
  },

  registerCallbacks: (onMessageReceived, onUserStatusChanged, onMessageDeleted) => {
    messageReceivedHandler = onMessageReceived;
    userStatusChangedHandler = onUserStatusChanged;
    messageDeletedHandler = onMessageDeleted;
  },

  joinGroup: (groupId) => {
    if (socket) {
      socket.emit('joinGroup', groupId);
    }
  },

  leaveGroup: (groupId) => {
    if (socket) {
      socket.emit('leaveGroup', groupId);
    }
  },

  emitTyping: (roomId) => {
    if (socket) {
      socket.emit('typing', roomId);
    }
  },

  emitStopTyping: (roomId) => {
    if (socket) {
      socket.emit('stopTyping', roomId);
    }
  },

  getSocket: () => socket,
};
