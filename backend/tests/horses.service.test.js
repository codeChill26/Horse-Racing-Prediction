describe('HorsesService registration approval and metrics', () => {
  function makePrismaMock() {
    return {
      horse: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      raceResult: {
        findMany: jest.fn(),
      },
    };
  }

  test('createHorse stores new horse as PENDING', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.horse.create.mockResolvedValue({ horseId: 1, name: 'Storm', status: 'PENDING' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/horses');

    const result = await service.createHorse(7, { name: 'Storm' });

    expect(result.status).toBe('PENDING');
    expect(prismaMock.horse.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: 7, name: 'Storm', status: 'PENDING' }),
      })
    );
  });

  test('reviewHorse requires reason when rejected', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/horses');

    await expect(service.reviewHorse(1, { status: 'REJECTED' }, 99)).rejects.toMatchObject({
      status: 400,
    });
    expect(prismaMock.horse.update).not.toHaveBeenCalled();
  });

  test('reviewHorse approves and clears rejection data', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.horse.findUnique.mockResolvedValue({ horseId: 1 });
    prismaMock.horse.update.mockResolvedValue({ horseId: 1, status: 'APPROVED' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/horses');

    const result = await service.reviewHorse(1, { status: 'APPROVED' }, 99);

    expect(result.status).toBe('APPROVED');
    expect(prismaMock.horse.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { horseId: 1 },
        data: expect.objectContaining({
          status: 'APPROVED',
          rejectionReason: null,
          reviewedById: 99,
        }),
      })
    );
  });

  test('buildCareerMetrics calculates win rate average and recent form', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    const race = (raceId, finishPosition) => ({
      finishPosition,
      race: {
        raceId,
        name: `Race ${raceId}`,
        scheduledAt: new Date(`2026-05-${raceId.toString().padStart(2, '0')}T00:00:00Z`),
        createdAt: new Date(),
        tournament: { tournamentId: 1, name: 'Spring Cup' },
      },
    });

    prismaMock.raceResult.findMany.mockResolvedValue([
      race(5, 1),
      race(4, 3),
      race(3, 2),
      race(2, 1),
      race(1, 4),
      race(6, 2),
    ]);

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/horses');

    const metrics = await service.buildCareerMetrics(10);

    expect(metrics.totalStarts).toBe(6);
    expect(metrics.wins).toBe(2);
    expect(metrics.winRate).toBe(33.33);
    expect(metrics.avgFinishPosition).toBe(2.17);
    expect(metrics.recentForm).toHaveLength(5);
    expect(metrics.recentFormText).toBe('1-3-2-1-4');
  });
});
