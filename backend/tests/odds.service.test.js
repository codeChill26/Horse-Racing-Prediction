describe('Odds service', () => {
  function makePrismaMock() {
    return {
      race: {
        findUnique: jest.fn(),
      },
      raceEntry: {
        findMany: jest.fn(),
      },
      odds: {
        upsert: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback({
        odds: {
          upsert: jest.fn(),
        },
      })),
    };
  }

  test('applyOddsSuggestions can create odds rows when table is empty', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();
    const emitToRace = jest.fn();

    prismaMock.race.findUnique.mockResolvedValue({
      raceId: 1,
      status: 'SCHEDULED',
      registrationOpen: false,
    });
    prismaMock.raceEntry.findMany.mockResolvedValue([
      { entryId: 11, status: 'APPROVED' },
      { entryId: 12, status: 'APPROVED' },
    ]);

    const upsertResults = [
      {
        oddsId: 1,
        raceId: 1,
        entryId: 11,
        oddsFinal: 1.5,
        entry: { horse: { horseId: 101, name: 'Thunder' }, jockey: { fullName: 'Jockey A' } },
      },
      {
        oddsId: 2,
        raceId: 1,
        entryId: 12,
        oddsFinal: 2.5,
        entry: { horse: { horseId: 102, name: 'Lightning' }, jockey: { fullName: 'Jockey B' } },
      },
    ];

    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        odds: {
          upsert: jest
            .fn()
            .mockResolvedValueOnce(upsertResults[0])
            .mockResolvedValueOnce(upsertResults[1]),
        },
      })
    );

    jest.doMock('../src/config/prisma', () => prismaMock);
    jest.doMock('../src/socket/emitter', () => ({ emitToRace }));

    const oddsService = require('../src/services/odds');

    // Σ(1/odds) = 1/1.5 + 1/2.5 = 106.67% >= 105% (100% + HOUSE_MARGIN), nên qua
    // được chốt chặn arbitrage trong applyOddsSuggestions.
    const result = await oddsService.applyOddsSuggestions(1, [
      { entryId: 11, oddsFinal: 1.5 },
      { entryId: 12, oddsFinal: 2.5 },
    ]);

    expect(result).toHaveLength(2);
    expect(prismaMock.raceEntry.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { raceId: 1 },
        select: { entryId: true, status: true },
      })
    );
    expect(emitToRace).toHaveBeenCalledWith(
      1,
      'odds:updated',
      expect.objectContaining({ raceId: 1 })
    );
  });

  test('applyOddsSuggestions cho phép sửa odds khi race IN_PROGRESS (đã đóng cược)', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();
    const emitToRace = jest.fn();

    prismaMock.race.findUnique.mockResolvedValue({
      raceId: 1,
      status: 'IN_PROGRESS',
      registrationOpen: false,
    });
    prismaMock.raceEntry.findMany.mockResolvedValue([
      { entryId: 11, status: 'APPROVED' },
      { entryId: 12, status: 'APPROVED' },
    ]);
    prismaMock.$transaction.mockImplementation(async (callback) =>
      callback({
        odds: {
          upsert: jest
            .fn()
            .mockResolvedValueOnce({ oddsId: 1, entryId: 11 })
            .mockResolvedValueOnce({ oddsId: 2, entryId: 12 }),
        },
      })
    );

    jest.doMock('../src/config/prisma', () => prismaMock);
    jest.doMock('../src/socket/emitter', () => ({ emitToRace }));

    const oddsService = require('../src/services/odds');

    // Σ(1/1.5 + 1/2.5) = 106.7% ≥ 105% -> qua guardrail arbitrage; IN_PROGRESS được phép.
    const result = await oddsService.applyOddsSuggestions(1, [
      { entryId: 11, oddsFinal: 1.5 },
      { entryId: 12, oddsFinal: 2.5 },
    ]);

    expect(result).toHaveLength(2);
    expect(emitToRace).toHaveBeenCalledWith(
      1,
      'odds:updated',
      expect.objectContaining({ raceId: 1 })
    );
  });
});
