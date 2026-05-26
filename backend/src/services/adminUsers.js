// backend/src/services/adminUsers.js

const prisma = require('../config/prisma');
const redisClient = require('../config/redis');

async function revokeUserSessions(userId) {
  // 1) Kill all access tokens for this user in Redis (immediate effect)
  // Keys are shaped: accessToken:<userId>:<jwt>
  const match = `accessToken:${userId}:*`;

  try {
    if (typeof redisClient?.scanIterator === 'function') {
      // node-redis v5 supports scanIterator
      for await (const key of redisClient.scanIterator({ MATCH: match, COUNT: 100 })) {
        await redisClient.del(key);
      }
    } else if (typeof redisClient?.keys === 'function') {
      // Fallback for older redis clients
      const keys = await redisClient.keys(match);
      if (Array.isArray(keys) && keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (err) {
    // In dev, don't fail the whole admin action just because Redis is down.
    // The user will still be blocked at login due to isActive=false.
  }

  // 2) Revoke refresh tokens in DB so user can't refresh into a new access token
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

class AdminUsersService {
  async listUsers({ roleCode } = {}) {
    const where = roleCode
      ? {
          role: {
            code: roleCode,
          },
        }
      : undefined;

    const users = await prisma.user.findMany({
      where,
      orderBy: { userId: 'desc' },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        isActive: true,
        lockedUntil: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: { roleId: true, code: true, name: true },
        },
      },
    });

    return users;
  }

  async toggleIsActive(userId) {
    const existing = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true, isActive: true },
    });

    if (!existing) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const newIsActive = !existing.isActive;

    const updated = await prisma.user.update({
      where: { userId },
      data: {
        isActive: newIsActive,
        lockedUntil: newIsActive ? null : undefined,
      },
      select: {
        userId: true,
        email: true,
        fullName: true,
        isActive: true,
        role: { select: { roleId: true, code: true, name: true } },
        updatedAt: true,
      },
    });

    await revokeUserSessions(userId);

    return updated;
  }

  async changeRole(userId, { roleId, roleCode }) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    let newRoleId = roleId;

    if (newRoleId === undefined) {
      const role = await prisma.role.findUnique({
        where: { code: roleCode },
        select: { roleId: true },
      });

      if (!role) {
        const err = new Error('Role not found');
        err.status = 400;
        throw err;
      }

      newRoleId = role.roleId;
    }

    const updated = await prisma.user.update({
      where: { userId },
      data: { roleId: newRoleId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        isActive: true,
        role: { select: { roleId: true, code: true, name: true } },
        updatedAt: true,
      },
    });

    await revokeUserSessions(userId);

    return updated;
  }
}

module.exports = new AdminUsersService();
