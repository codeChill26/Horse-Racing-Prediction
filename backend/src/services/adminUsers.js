// backend/src/services/adminUsers.js

const prisma = require('../config/prisma');
const redisClient = require('../config/redis');
const bcrypt = require('bcrypt');
const { Prisma } = require('@prisma/client');

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

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        isActive: true,
        lockedUntil: true,
        licenseNumber: true,
        weight: true,
        bio: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true,
        role: {
          select: { roleId: true, code: true, name: true },
        },
      },
    });

    if (!user) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    return user;
  }

  async createUser(data) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
      select: { userId: true },
    });

    if (existing) {
      const err = new Error(`Email already exists within the system: ${data.email}`);
      err.status = 400;
      throw err;
    }

    let role;
    if (data.roleId !== undefined) {
      role = await prisma.role.findUnique({
        where: { roleId: data.roleId },
        select: { roleId: true, code: true },
      });
    } else if (data.roleCode) {
      role = await prisma.role.findUnique({
        where: { code: data.roleCode },
        select: { roleId: true, code: true },
      });
    } else {
      // Default role if not specified
      role = await prisma.role.findUnique({
        where: { code: 'SPECTATOR' },
        select: { roleId: true, code: true },
      });
    }

    if (!role) {
      const err = new Error('Requested Role not found in database.');
      err.status = 400;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const isJockey = role.code === 'JOCKEY';
    const isProfileComplete =
      isJockey ? !!data.licenseNumber && data.weight !== undefined : true;

    const weightValue =
      data.weight === undefined ? undefined : new Prisma.Decimal(data.weight);

    // mirror register: create wallet + initial transaction for spectators
    const created = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          avatarUrl: data.avatarUrl,
          roleId: role.roleId,
          isActive: true,
          lockedUntil: null,
          licenseNumber: data.licenseNumber,
          weight: weightValue,
          bio: data.bio,
          isProfileComplete,
        },
        select: {
          userId: true,
          email: true,
          fullName: true,
          phoneNumber: true,
          avatarUrl: true,
          isActive: true,
          lockedUntil: true,
          licenseNumber: true,
          weight: true,
          bio: true,
          isProfileComplete: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { roleId: true, code: true, name: true } },
        },
      });

      if (role.code === 'SPECTATOR') {
        const wallet = await tx.pointWallet.create({
          data: {
            userId: user.userId,
            balance: 100,
            isFrozen: 0,
          },
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.walletId,
            amount: 100,
            balanceAfter: 100,
            referenceType: 'SYSTEM_REGISTRATION',
            referenceId: null,
            type: 'INITIAL_BONUS',
            description: 'Received 100 points initial signup reward',
          },
        });
      }

      return user;
    });

    return created;
  }

  async updateUser(userId, data) {
    const existing = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!existing) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const updateData = {};

    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber;
    if (data.bio !== undefined) updateData.bio = data.bio;
    if (data.isProfileComplete !== undefined) updateData.isProfileComplete = data.isProfileComplete;
    if (data.weight !== undefined) updateData.weight = new Prisma.Decimal(data.weight);

    if (data.password !== undefined) {
      updateData.passwordHash = await bcrypt.hash(data.password, 10);
      // Changing password should revoke sessions
      await revokeUserSessions(userId);
    }

    const updated = await prisma.user.update({
      where: { userId },
      data: updateData,
      select: {
        userId: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        isActive: true,
        lockedUntil: true,
        licenseNumber: true,
        weight: true,
        bio: true,
        isProfileComplete: true,
        createdAt: true,
        updatedAt: true,
        role: { select: { roleId: true, code: true, name: true } },
      },
    });

    return updated;
  }

  async deactivateUser(userId) {
    const existing = await prisma.user.findUnique({
      where: { userId },
      select: { userId: true },
    });

    if (!existing) {
      const err = new Error('User not found');
      err.status = 404;
      throw err;
    }

    const updated = await prisma.user.update({
      where: { userId },
      data: {
        isActive: false,
        lockedUntil: null,
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
