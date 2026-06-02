describe('AdminTournamentsService business rules', () => {
  function makePrismaMock() {
    return {
      tournament: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      race: {
        count: jest.fn(),
      },
    };
  }

  test('changeStatus blocks invalid transition', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'DRAFT' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    await expect(service.changeStatus(1, { status: 'FINISHED' })).rejects.toMatchObject({
      status: 409,
    });
  });

  test('changeStatus requires cancelReason for CANCELLED', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'OPEN' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    await expect(service.changeStatus(1, { status: 'CANCELLED' })).rejects.toMatchObject({
      status: 400,
    });
  });

  test('changeStatus allows DRAFT to OPEN', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'DRAFT' });
    prismaMock.tournament.update.mockResolvedValue({ tournamentId: 1, status: 'OPEN' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    const result = await service.changeStatus(1, { status: 'OPEN' });

    expect(result.status).toBe('OPEN');
    expect(prismaMock.tournament.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 1 },
        data: { status: 'OPEN', cancelReason: null },
      })
    );
  });

  test('updateTournament blocks when FINISHED', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'FINISHED' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    await expect(service.updateTournament(1, { name: 'New' })).rejects.toMatchObject({
      status: 409,
    });
  });

  test('deleteTournament cancels instead of deleting when races exist', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'OPEN', cancelReason: null });
    prismaMock.race.count.mockResolvedValue(2);
    prismaMock.tournament.update.mockResolvedValue({ tournamentId: 1, status: 'CANCELLED', cancelReason: 'bad weather' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    const result = await service.deleteTournament(1, { reason: 'bad weather' });

    expect(result.action).toBe('CANCELLED');
    expect(prismaMock.tournament.delete).not.toHaveBeenCalled();
    expect(prismaMock.tournament.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 1 },
        data: { status: 'CANCELLED', cancelReason: 'bad weather' },
      })
    );
  });

  test('deleteTournament requires reason when races exist', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'OPEN', cancelReason: null });
    prismaMock.race.count.mockResolvedValue(1);

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    await expect(service.deleteTournament(1, {})).rejects.toMatchObject({ status: 400 });
    expect(prismaMock.tournament.delete).not.toHaveBeenCalled();
  });

  test('deleteTournament deletes when no races exist', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findUnique.mockResolvedValue({ tournamentId: 1, status: 'DRAFT', cancelReason: null });
    prismaMock.race.count.mockResolvedValue(0);
    prismaMock.tournament.delete.mockResolvedValue({ tournamentId: 1 });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/adminTournaments');

    const result = await service.deleteTournament(1, {});

    expect(result.action).toBe('DELETED');
    expect(prismaMock.tournament.delete).toHaveBeenCalledWith({ where: { tournamentId: 1 } });
    expect(prismaMock.tournament.update).not.toHaveBeenCalled();
  });
});
