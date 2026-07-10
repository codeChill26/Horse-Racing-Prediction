// backend/src/services/adminUsers.js

const prisma = require('../config/prisma');
const redisClient = require('../config/redis');
const bcrypt = require('bcrypt');
const { Prisma } = require('@prisma/client');
const socketEmitter = require('../socket/emitter');

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

  /**
   * Tầng nghiệp vụ xử lý truy vấn vi phạm cá nhân dựa trên tài khoản
   */
  async getMyViolations(userId) {
    // 1. Quét tìm tất cả các RaceEntry liên quan trực tiếp đến userId này
    const entries = await prisma.raceEntry.findMany({
      where: {
        OR: [
          { jockeyId: userId },
          { horse: { ownerId: userId } }
        ]
      },
      select: { entryId: true }
    });

    const entryIds = entries.map(e => e.entryId);

    // 2. Truy vấn từ Database thay vì global storage
    const myViolations = await prisma.violation.findMany({
      where: {
        entryId: { in: entryIds }
      }
    });

    return {
      violations: myViolations,
      total: myViolations.length
    };
  }

  /**
   * Tầng nghiệp vụ xử lý lấy danh sách vi phạm hệ thống (Admin)
   */
  async getViolationsList({ status, severity }) {
    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const violations = await prisma.violation.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Tính toán thống kê từ DB
    const stats = await prisma.violation.groupBy({
      by: ['status'],
      _count: true
    });

    // Format kết quả trả về khớp với format cũ của hệ thống
    const formattedStats = {
      open: stats.find(s => s.status === 'OPEN')?._count || 0,
      reviewing: stats.find(s => s.status === 'REVIEWING')?._count || 0,
      resolved: stats.find(s => s.status === 'RESOLVED')?._count || 0,
      dismissed: stats.find(s => s.status === 'DISMISSED')?._count || 0
    };

    return {
      violations,
      total: violations.length,
      stats: formattedStats
    };
  }

  /**
   * Tầng nghiệp vụ xử lý ghi nhận báo cáo vi phạm mới (Prisma)
   */
  async reportViolation(data) {
  try {
    const newViolation = await prisma.violation.create({
      data: {
        raceId: parseInt(data.raceId),
        entryId: data.entryId ? parseInt(data.entryId) : null,
        type: data.type,
        severity: data.severity,
        description: data.description,
        status: 'OPEN'
      }
    });
    socketEmitter.emit('violation:created', newViolation);
    return { violation: newViolation };

  } catch (error) {
    throw error;
  }
}

  /**
   * Tầng nghiệp vụ xử lý quyết định xử phạt (Prisma Transaction)
   */
  async resolveViolation(id, penalty, note) {
    const violationId = parseInt(id);
    
    // Sử dụng transaction để đảm bảo dữ liệu đồng nhất
    const result = await prisma.$transaction(async (tx) => {
      const violation = await tx.violation.update({
        where: { violationId },
        data: {
          status: 'RESOLVED',
          penalty: penalty,
          resolutionNote: note
        }
      });

      if (penalty === 'DQ' && violation.entryId) {
        await tx.raceEntry.update({
          where: { entryId: violation.entryId },
          data: { 
            status: 'REJECTED', 
            rejectionReason: `Truất quyền thi đấu: ${note}` 
          }
        });
      }
      
      return violation;
    });
    
    socketEmitter.emit('violation:resolved', { violationId: id, status: 'RESOLVED', penalty });
    return { violation: result, effects: { entryStatusChanged: penalty } };
  }
}

module.exports = new AdminUsersService();
