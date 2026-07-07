const User = require('../models/User');

const userSockets = new Map();
const offlineTimeouts = new Map();

const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    socket.on('setup', async (user) => {
      if (!user || !user._id) return;
      
      const userId = user._id.toString();
      socket.join(userId);
      console.log(`User ${userId} set up socket room`);

      // Clear any pending offline timeout since the user is active/connected again
      if (offlineTimeouts.has(userId)) {
        clearTimeout(offlineTimeouts.get(userId));
        offlineTimeouts.delete(userId);
        console.log(`Cancelled offline timeout for user: ${userId}`);
      }

      if (!userSockets.has(userId)) {
        userSockets.set(userId, new Set());
      }
      userSockets.get(userId).add(socket.id);

      try {
        await User.findByIdAndUpdate(userId, { isOnline: true });
        io.emit('userStatusChanged', { userId, isOnline: true });
      } catch (err) {
        console.error('Socket setup error:', err);
      }
    });

    socket.on('joinGroup', (groupId) => {
      if (!groupId) return;
      socket.join(groupId.toString());
      console.log(`Socket ${socket.id} joined group room: ${groupId}`);
    });

    socket.on('leaveGroup', (groupId) => {
      if (!groupId) return;
      socket.leave(groupId.toString());
      console.log(`Socket ${socket.id} left group room: ${groupId}`);
    });

    socket.on('typing', (room) => {
      socket.to(room).emit('typing', room);
    });

    socket.on('stopTyping', (room) => {
      socket.to(room).emit('stopTyping', room);
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      let disconnectedUserId = null;
      for (const [userId, sockets] of userSockets.entries()) {
        if (sockets.has(socket.id)) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            userSockets.delete(userId);
            disconnectedUserId = userId;
          }
          break;
        }
      }

      if (disconnectedUserId) {
        const userId = disconnectedUserId;
        
        if (offlineTimeouts.has(userId)) {
          clearTimeout(offlineTimeouts.get(userId));
        }

        // Set a 3-second debounce for offline status update
        const timeout = setTimeout(async () => {
          try {
            offlineTimeouts.delete(userId);
            const lastSeen = new Date();
            await User.findByIdAndUpdate(userId, {
              isOnline: false,
              lastSeen,
            });
            io.emit('userStatusChanged', {
              userId,
              isOnline: false,
              lastSeen,
            });
            console.log(`User ${userId} marked offline after 3s debounce.`);
          } catch (err) {
            console.error('Socket disconnect error:', err);
          }
        }, 3000);

        offlineTimeouts.set(userId, timeout);
      }
    });
  });
};

module.exports = { socketHandler, userSockets, offlineTimeouts };
