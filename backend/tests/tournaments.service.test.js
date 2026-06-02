describe('Public TournamentsService visibility rules', () => {
  function makePrismaMock() {
    return {
      tournament: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
  }

  test('listPublicTournaments excludes DRAFT and CANCELLED tournaments', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findMany.mockResolvedValue([
      { tournamentId: 1, name: 'Open Tournament', status: 'OPEN' },
    ]);

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/tournaments');

    const result = await service.listPublicTournaments();

    expect(result).toHaveLength(1);
    expect(prismaMock.tournament.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ['OPEN', 'ONGOING', 'FINISHED'] } },
      })
    );
  });

  test('getPublicTournamentById searches only public statuses', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findFirst.mockResolvedValue({
      tournamentId: 2,
      name: 'Ongoing Tournament',
      status: 'ONGOING',
    });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/tournaments');

    const result = await service.getPublicTournamentById(2);

    expect(result.tournamentId).toBe(2);
    expect(prismaMock.tournament.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tournamentId: 2, status: { in: ['OPEN', 'ONGOING', 'FINISHED'] } },
      })
    );
  });

  test('getPublicTournamentById returns 404 when tournament is not public', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.tournament.findFirst.mockResolvedValue(null);

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/tournaments');

    await expect(service.getPublicTournamentById(3)).rejects.toMatchObject({ status: 404 });
  });
});
