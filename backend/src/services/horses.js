const prisma = require('../config/prisma');

function httpError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

function horseSelect() {
  return {
    horseId: true,
    ownerId: true,
    name: true,
    breed: true,
    dateOfBirth: true,
    sex: true,
    color: true,
    status: true,
    rejectionReason: true,
    approvedAt: true,
    rejectedAt: true,
    reviewedById: true,
    createdAt: true,
    updatedAt: true,
  };
}

class HorsesService {
  async buildCareerMetrics(horseId) {
    const results = await prisma.raceResult.findMany({
      where: { horseId },
      orderBy: [
        { race: { scheduledAt: 'desc' } },
        { createdAt: 'desc' },
        { resultId: 'desc' },
      ],
      select: {
        finishPosition: true,
        race: {
          select: {
            raceId: true,
            name: true,
            scheduledAt: true,
            createdAt: true,
            tournament: {
              select: {
                tournamentId: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const totalStarts = results.length;
    const wins = results.filter((result) => result.finishPosition === 1).length;
    const finishSum = results.reduce((sum, result) => sum + result.finishPosition, 0);
    const recentResults = results.slice(0, 5);

    return {
      totalStarts,
      wins,
      winRate: totalStarts === 0 ? 0 : round2((wins / totalStarts) * 100),
      avgFinishPosition: totalStarts === 0 ? null : round2(finishSum / totalStarts),
      recentForm: recentResults.map((result) => ({
        raceId: result.race.raceId,
        raceName: result.race.name,
        tournamentId: result.race.tournament?.tournamentId,
        tournamentName: result.race.tournament?.name,
        scheduledAt: result.race.scheduledAt,
        finishPosition: result.finishPosition,
      })),
      recentFormText: recentResults.map((result) => result.finishPosition).join('-'),
    };
  }

  async attachCareerMetrics(horse) {
    return {
      ...horse,
      careerMetrics: await this.buildCareerMetrics(horse.horseId),
    };
  }

  async attachCareerMetricsList(horses) {
    return Promise.all(horses.map((horse) => this.attachCareerMetrics(horse)));
  }

  async createHorse(ownerId, data) {
    return prisma.horse.create({
      data: {
        ownerId,
        name: data.name,
        breed: data.breed,
        dateOfBirth: data.dateOfBirth,
        sex: data.sex,
        color: data.color,
        status: 'PENDING',
      },
      select: horseSelect(),
    });
  }

  async listOwnerHorses(ownerId) {
    const horses = await prisma.horse.findMany({
      where: { ownerId },
      orderBy: { horseId: 'desc' },
      select: horseSelect(),
    });

    return this.attachCareerMetricsList(horses);
  }

  async listApprovedHorses() {
    const horses = await prisma.horse.findMany({
      where: { status: 'APPROVED' },
      orderBy: { horseId: 'desc' },
      select: horseSelect(),
    });

    return this.attachCareerMetricsList(horses);
  }

  async getPublicHorseById(horseId) {
    const horse = await prisma.horse.findFirst({
      where: { horseId, status: 'APPROVED' },
      select: horseSelect(),
    });

    if (!horse) throw httpError('Horse not found', 404);
    return this.attachCareerMetrics(horse);
  }

  async listAdminHorses({ status } = {}) {
    return prisma.horse.findMany({
      where: status ? { status } : undefined,
      orderBy: { horseId: 'desc' },
      select: horseSelect(),
    });
  }

  async getAdminHorseById(horseId) {
    const horse = await prisma.horse.findUnique({
      where: { horseId },
      select: horseSelect(),
    });

    if (!horse) throw httpError('Horse not found', 404);
    return this.attachCareerMetrics(horse);
  }

  async reviewHorse(horseId, { status, reason }, reviewerId) {
    if (status === 'REJECTED' && !reason) {
      throw httpError('reason is required when rejecting a horse', 400);
    }

    const horse = await prisma.horse.findUnique({
      where: { horseId },
      select: { horseId: true },
    });

    if (!horse) throw httpError('Horse not found', 404);

    const now = new Date();
    const data =
      status === 'APPROVED'
        ? {
            status: 'APPROVED',
            rejectionReason: null,
            approvedAt: now,
            rejectedAt: null,
            reviewedById: reviewerId,
          }
        : {
            status: 'REJECTED',
            rejectionReason: reason,
            approvedAt: null,
            rejectedAt: now,
            reviewedById: reviewerId,
          };

    return prisma.horse.update({
      where: { horseId },
      data,
      select: horseSelect(),
    });
  }
/**
   * Thu hồi ngựa (Revoke) & Hủy các entry liên quan
   */
  async revokeHorse(horseId, reason) {
    const socketEmitter = require('../socket/emitter');
    const parsedHorseId = parseInt(horseId);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Đổi trạng thái ngựa thành REVOKED
      const horse = await tx.horse.update({
        where: { horseId: parsedHorseId },
        data: { status: 'INACTIVE' } 
      });

      // 2. Hủy toàn bộ RaceEntry đang PENDING hoặc APPROVED của ngựa này
      const affectedEntries = await tx.raceEntry.findMany({
        where: { 
          horseId: parsedHorseId,
          status: { in: ['PENDING', 'APPROVED'] }
        }
      });

      if (affectedEntries.length > 0) {
        await tx.raceEntry.updateMany({
          where: { horseId: parsedHorseId, status: { in: ['PENDING', 'APPROVED'] } },
          data: { status: 'REJECTED', rejectionReason: `Ngựa bị thu hồi bởi Admin: ${reason}` }
        });
      }

      return { horse, affectedEntries };
    });

    // 3. Bắn socket cập nhật cho các trận đấu có ngựa bị loại
    for (const entry of result.affectedEntries) {
      socketEmitter.emitToRace(entry.raceId, 'entry:status_changed', {
        entryId: entry.entryId,
        raceId: entry.raceId,
        newStatus: 'REJECTED',
        updatedAt: new Date().toISOString()
      });
    }

    return result.horse;
  }
  
}

module.exports = new HorsesService();
