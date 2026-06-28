// backend/src/socket/emitter.js
// Helper to emit socket events from services without circular dependency

const { getNotificationNsp } = require('./index');

function emitToUser(userId, event, data) {
  try {
    getNotificationNsp().to(`user:${userId}`).emit(event, data);
  } catch (e) {
    // socket not initialized (e.g., during testing)
  }
}

function emitToAdmin(event, data) {
  try {
    getNotificationNsp().to('admin').emit(event, data);
  } catch (e) {
  }
}

function emitToRace(raceId, event, data) {
  try {
    getNotificationNsp().to(`race:${raceId}`).emit(event, data);
  } catch (e) {
  }
}

function emitToAll(event, data) {
  try {
    getNotificationNsp().emit(event, data);
  } catch (e) {
  }
}

module.exports = { emitToUser, emitToAdmin, emitToRace, emitToAll };
