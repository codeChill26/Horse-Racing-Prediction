// backend/src/socket/index.js

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const prisma = require('../config/prisma');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret';

let io = null;

function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const notificationNsp = io.of('/notifications');

  notificationNsp.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = Number(decoded.sub);
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  notificationNsp.on('connection', async (socket) => {
    const userId = socket.userId;
    const role = socket.userRole;

    socket.join(`user:${userId}`);
    if (role === 'ADMIN') {
      socket.join('admin');
    }

    socket.on('subscribe:race', (raceId) => {
      if (raceId) socket.join(`race:${raceId}`);
    });

    socket.on('unsubscribe:race', (raceId) => {
      if (raceId) socket.leave(`race:${raceId}`);
    });

    socket.on('disconnect', () => {
    });
  });

  return io;
}

function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocket first.');
  }
  return io;
}

function getNotificationNsp() {
  return getIO().of('/notifications');
}

module.exports = { initSocket, getIO, getNotificationNsp };
