describe('RaceEntriesService approved horse rule', () => {
  function makePrismaMock() {
    return {
      race: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      horse: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      raceEntry: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => callback({
        race: {
          update: jest.fn(),
        },
        raceEntry: {
          updateMany: jest.fn(),
        },
      })),
    };
  }

  test('createEntry blocks non-approved horse', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.race.findUnique.mockResolvedValue({ raceId: 1, registrationOpen: true });
    prismaMock.horse.findUnique.mockResolvedValue({
      horseId: 2,
      ownerId: 7,
      status: 'PENDING',
    });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/raceEntries');

    await expect(service.createEntry(1, 2, 7)).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.raceEntry.create).not.toHaveBeenCalled();
  });

  test('createEntry allows approved owner horse', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.race.findUnique.mockResolvedValue({ raceId: 1, registrationOpen: true });
    prismaMock.horse.findUnique.mockResolvedValue({
      horseId: 2,
      ownerId: 7,
      status: 'APPROVED',
    });
    prismaMock.raceEntry.create.mockResolvedValue({ entryId: 3, raceId: 1, horseId: 2, status: 'PENDING' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/raceEntries');

    const result = await service.createEntry(1, 2, 7);

    expect(result.entryId).toBe(3);
    expect(prismaMock.raceEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { raceId: 1, horseId: 2, jockeyId: undefined, status: 'PENDING' },
      })
    );
  });

  test('createEntry blocks closed registration gate', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.race.findUnique.mockResolvedValue({ raceId: 1, registrationOpen: false });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/raceEntries');

    await expect(service.createEntry(1, 2, 7)).rejects.toMatchObject({ status: 409 });
    expect(prismaMock.horse.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.raceEntry.create).not.toHaveBeenCalled();
  });

  test('reviewEntry approves pending entry', async () => {
    jest.resetModules();
    const prismaMock = makePrismaMock();

    prismaMock.raceEntry.findUnique.mockResolvedValue({ entryId: 3, status: 'PENDING' });
    prismaMock.raceEntry.update.mockResolvedValue({ entryId: 3, status: 'APPROVED' });

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/raceEntries');

    const result = await service.reviewEntry(3, { status: 'APPROVED' }, 1);

    expect(result.status).toBe('APPROVED');
    expect(prismaMock.raceEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { entryId: 3 },
        data: expect.objectContaining({
          status: 'APPROVED',
          rejectionReason: null,
          reviewedById: 1,
        }),
      })
    );
  });

  test('setRegistrationGate closes race and auto-rejects pending entries', async () => {
    jest.resetModules();
    const txRaceUpdate = jest.fn().mockResolvedValue({ raceId: 1, registrationOpen: false });
    const txEntryUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
    const prismaMock = makePrismaMock();

    prismaMock.race.findUnique.mockResolvedValue({ raceId: 1 });
    prismaMock.$transaction.mockImplementation(async (callback) => callback({
      race: { update: txRaceUpdate },
      raceEntry: { updateMany: txEntryUpdateMany },
    }));

    jest.doMock('../src/config/prisma', () => prismaMock);
    const service = require('../src/services/raceEntries');

    const result = await service.setRegistrationGate(1, false);

    expect(result.autoRejectedCount).toBe(2);
    expect(txRaceUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { raceId: 1 },
        data: expect.objectContaining({ registrationOpen: false }),
      })
    );
    expect(txEntryUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { raceId: 1, status: 'PENDING' },
        data: expect.objectContaining({ status: 'REJECTED' }),
      })
    );
  });
});
