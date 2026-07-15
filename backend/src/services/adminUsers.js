const prisma = require('../config/prisma');
const redisClient = require('../config/redis');
const bcrypt = require('bcrypt');
const { Prisma } = require('@prisma/client');
const socketEmitter = require('../socket/emitter');
const { buildRoleWhereForCode } = require('../utils/roleCodeVariants');

async function revokeUserSessions(userId) {
  // 1) Kill all access tokens for this user in Redis (immediate effect)
  const match = `accessToken:${userId}:*`;

  try {
    if (typeof redisClient?.scanIterator === 'function') {
      for await (const key of redisClient.scanIterator({ MATCH: match, COUNT: 100 })) {
        await redisClient.del(key);
      }
    } else if (typeof redisClient?.keys === 'function') {
      const keys = await redisClient.keys(match);
      if (Array.isArray(keys) && keys.length > 0) {
        await redisClient.del(keys);
      }
    }
  } catch (err) {
    // Ignore Redis errors for now
  }

  // 2) Revoke refresh tokens in DB
  await prisma.refreshToken.updateMany({
    where: { userId },
    data: { isRevoked: true },
  });
}

class AdminUsersService {
  async listUsers({ roleCode } = {}) {
    // Chuẩn hoá: các biến thể role code của cùng 1 vai trò (vd 'Referee' /
    // 'RACE_REFEREE' / 'REFEREE') đều được gom về 1 nhóm để tránh "biến mất"
    // user khi DB còn lưu variant cũ. Xem utils/roleCodeVariants.js.
    const roleWhere = buildRoleWhereForCode(roleCode);
    const where = roleWhere ? { role: roleWhere } : undefined;

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
    const isProfileComplete = isJockey ? !!data.licenseNumber && data.weight !== undefined : true;
    const weightValue = data.weight === undefined ? undefined : new Prisma.Decimal(data.weight);

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
   * Truy vấn vi phạm cá nhân
   */
  async getMyViolations(userId) {
    const entries = await prisma.raceEntry.findMany({
      where: { OR: [{ jockeyId: userId }, { horse: { ownerId: userId } }] },
      select: { entryId: true }
    });
    const entryIds = entries.map(e => e.entryId);
    const myViolations = await prisma.violation.findMany({
      where: { entryId: { in: entryIds } }
    });
    return { violations: myViolations, total: myViolations.length };
  }

  /**
   * HIGH-20: User xem chi tiết violation của chính mình
   * Chỉ trả về nếu violation đó thuộc về entry mà user là jockey hoặc owner của horse.
   */
  async getMyViolationById(userId, id) {
    let violationId;
    if (typeof id === 'string' && id.startsWith('VIO-')) {
      violationId = parseInt(id.replace('VIO-', ''), 10);
    } else {
      violationId = parseInt(id, 10);
    }

    if (!Number.isInteger(violationId) || violationId <= 0) {
      throw Object.assign(new Error('Invalid violation id'), { status: 400 });
    }

    const violation = await prisma.violation.findUnique({
      where: { violationId },
      include: {
        race: { select: { name: true } },
        entry: {
          include: {
            horse: { select: { name: true, ownerId: true } },
            jockey: { select: { userId: true } },
          },
        },
      },
    });

    if (!violation) {
      throw Object.assign(new Error('Violation not found'), { status: 404 });
    }

    const isJockey = violation.entry?.jockey?.userId === userId;
    const isOwner = violation.entry?.horse?.ownerId === userId;
    if (!isJockey && !isOwner) {
      throw Object.assign(new Error('Access denied'), { status: 403 });
    }

    return {
      violation: {
        violationId: `VIO-${String(violation.violationId).padStart(3, '0')}`,
        raceId: violation.raceId,
        raceName: violation.race?.name || 'N/A',
        entryId: violation.entryId,
        horseName: violation.entry?.horse?.name || 'N/A',
        type: violation.type,
        severity: violation.severity,
        status: violation.status,
        penalty: violation.penalty,
        description: violation.description,
        resolutionNote: violation.resolutionNote,
        createdAt: violation.createdAt,
        updatedAt: violation.updatedAt,
        resolvedAt: violation.status === 'RESOLVED' || violation.status === 'DISMISSED'
          ? violation.updatedAt
          : null,
      },
    };
  }

  /**
   * Admin lấy danh sách vi phạm
   */
  async getViolationsList({ status, severity }) {
    const where = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const rawViolations = await prisma.violation.findMany({
      where,
      include: {
        race: { select: { name: true } },
        entry: { include: { horse: { select: { name: true } }, jockey: { select: { fullName: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });

    const violations = rawViolations.map(v => ({
      violationId: `VIO-${String(v.violationId).padStart(3, '0')}`,
      raceId: v.raceId,
      raceName: v.race?.name || 'N/A',
      entryId: v.entryId,
      horseName: v.entry?.horse?.name || 'N/A',
      jockeyName: v.entry?.jockey?.fullName || 'N/A',
      type: v.type,
      severity: v.severity,
      status: v.status,
      description: v.description,
      penalty: v.penalty,
      penaltyType: v.penalty,
      createdAt: v.createdAt,
      updatedAt: v.updatedAt
    }));

    const stats = await prisma.violation.groupBy({ by: ['status'], _count: true });
    const formattedStats = {
      open: stats.find(s => s.status === 'OPEN')?._count || 0,
      reviewing: stats.find(s => s.status === 'REVIEWING')?._count || 0,
      resolved: stats.find(s => s.status === 'RESOLVED')?._count || 0,
      dismissed: stats.find(s => s.status === 'DISMISSED')?._count || 0
    };

    return { violations, total: violations.length, stats: formattedStats };
  }

  /**
   * CRITICAL-12: Admin xem chi tiết
   */
  async getViolationById(id) {
    let violationId;
    if (id.startsWith('VIO-')) {
      violationId = parseInt(id.replace('VIO-', ''), 10);
    } else {
      violationId = parseInt(id, 10);
    }

    const v = await prisma.violation.findUnique({
      where: { violationId },
      include: {
        race: { select: { name: true } },
        entry: {
          include: {
            horse: { include: { owner: true } },
            jockey: true
          }
        }
      }
    });

    if (!v) throw Object.assign(new Error('Violation not found'), { status: 404 });

    return {
      violation: {
        violationId: `VIO-${String(v.violationId).padStart(3, '0')}`,
        raceId: v.raceId,
        raceName: v.race?.name || 'N/A',
        entryId: v.entryId,
        horseName: v.entry?.horse?.name || 'N/A',
        horse: v.entry?.horse ? {
          horseId: v.entry.horse.horseId,
          name: v.entry.horse.name,
          breed: v.entry.horse.breed,
          ownerName: v.entry.horse.owner?.fullName || 'N/A',
          ownerEmail: v.entry.horse.owner?.email || 'N/A'
        } : null,
        jockeyId: v.entry?.jockey?.userId || null,
        jockeyName: v.entry?.jockey?.fullName || 'N/A',
        jockeyEmail: v.entry?.jockey?.email || 'N/A',
        type: v.type,
        severity: v.severity,
        status: v.status,
        description: v.description,
        penalty: v.penalty,
        penaltyType: v.penalty,
        resolutionNote: v.resolutionNote,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
        history: [] // Database hiện tại chưa có table history, trả mảng rỗng để chống sập FE
      }
    };
  }

  /**
   * CRITICAL-13: Admin đổi trạng thái sang Đang xử lý
   */
  async startReviewViolation(id, adminId) {
    let violationId = id.startsWith('VIO-') ? parseInt(id.replace('VIO-', ''), 10) : parseInt(id, 10);
    
    const existing = await prisma.violation.findUnique({ where: { violationId } });
    if (!existing) throw Object.assign(new Error('Violation not found'), { status: 404 });
    if (existing.status !== 'OPEN') throw Object.assign(new Error('Violation is not in OPEN status'), { status: 400 });

    const violation = await prisma.violation.update({
      where: { violationId },
      data: { status: 'REVIEWING' }
    });

    return {
      violation: {
        violationId: `VIO-${String(violation.violationId).padStart(3, '0')}`,
        status: violation.status,
        updatedAt: violation.updatedAt
      }
    };
  }

  /**
   * CRITICAL-14: Admin Xử phạt (Kèm Transaction & Socket)
   */
  async resolveViolation(id, penalty, note, adminId) {
    if (!penalty) throw Object.assign(new Error('penalty is required'), { status: 400 });
    if (!note) throw Object.assign(new Error('note is required'), { status: 400 });

    let violationId = id.startsWith('VIO-') ? parseInt(id.replace('VIO-', ''), 10) : parseInt(id, 10);
    
    const result = await prisma.$transaction(async (tx) => {
      const violation = await tx.violation.update({
        where: { violationId },
        data: { status: 'RESOLVED', penalty: penalty, resolutionNote: note }
      });

      // Nếu phạt Loại (DQ) thì cập nhật RaceEntry thành DQ
      if (penalty === 'DQ' && violation.entryId) {
        await tx.raceEntry.update({
          where: { entryId: violation.entryId },
          data: { status: 'DQ', rejectionReason: `Truất quyền thi đấu: ${note}` } 
        });
      }
      return violation;
    });

    const payload = {
      violation: {
        violationId: `VIO-${String(result.violationId).padStart(3, '0')}`,
        status: 'RESOLVED',
        penalty: penalty,
        penaltyType: penalty,
        resolutionNote: note,
        resolvedAt: result.updatedAt
      },
      effects: { entryStatusChanged: penalty === 'DQ' ? 'DQ' : null, pointsDeducted: null }
    };
    
    socketEmitter.emitToAdmin('violation:resolved', payload);
    if (result.raceId) socketEmitter.emitToRace(result.raceId, 'violation:resolved', payload);
    
    // Nếu bị DQ, phải emit thay đổi Entry cho người chơi đang mở BettingModal
    if (penalty === 'DQ' && result.entryId) {
      socketEmitter.emitToRace(result.raceId, 'entry:status_changed', {
        entryId: result.entryId,
        raceId: result.raceId,
        newStatus: 'DQ',
        updatedAt: result.updatedAt
      });
    }

    return payload;
  }

  /**
   * CRITICAL-15: Admin Bác bỏ vi phạm
   */
  async dismissViolation(id, reason, adminId) {
    if (!reason) throw Object.assign(new Error('reason is required'), { status: 400 });
    let violationId = id.startsWith('VIO-') ? parseInt(id.replace('VIO-', ''), 10) : parseInt(id, 10);

    const existing = await prisma.violation.findUnique({ where: { violationId } });
    if (!existing) throw Object.assign(new Error('Violation not found'), { status: 404 });

    const violation = await prisma.violation.update({
      where: { violationId },
      data: { status: 'DISMISSED', resolutionNote: reason }
    });

    return {
      violation: {
        violationId: `VIO-${String(violation.violationId).padStart(3, '0')}`,
        status: violation.status,
        resolutionNote: violation.resolutionNote,
        updatedAt: violation.updatedAt
      }
    };
  }
}

module.exports = new AdminUsersService();