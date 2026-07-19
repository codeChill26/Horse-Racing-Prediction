const express = require('express');
const request = require('supertest');

async function buildEntriesAppWithRole(roleCode) {
  jest.resetModules();

  jest.doMock('../src/middlewares/auth', () => {
    return (req, _res, next) => {
      req.user = { sub: 7, email: 'user@example.com', role: roleCode };
      req.token = 'dummy';
      return next();
    };
  });

  jest.doMock('../src/services/raceEntries', () => {
    return {
      createEntry: jest.fn(),
      reviewEntry: jest.fn(),
    };
  });

  const router = require('../src/routes/raceEntries');
  const raceEntriesService = require('../src/services/raceEntries');

  const app = express();
  app.use(express.json());
  app.use('/api/entries', router);

  return { app, raceEntriesService };
}

async function buildAdminRacesAppWithRole(roleCode) {
  jest.resetModules();

  jest.doMock('../src/middlewares/auth', () => {
    return (req, _res, next) => {
      req.user = { sub: 1, email: 'admin@example.com', role: roleCode };
      req.token = 'dummy';
      return next();
    };
  });

  jest.doMock('../src/services/raceEntries', () => {
    return {
      setRegistrationGate: jest.fn(),
    };
  });

  const router = require('../src/routes/admin/races');
  const raceEntriesService = require('../src/services/raceEntries');

  const app = express();
  app.use(express.json());
  app.use('/api/admin/races', router);

  return { app, raceEntriesService };
}

describe('Race entry routes', () => {
  test('POST /api/entries submits entry for horse owner', async () => {
    const { app, raceEntriesService } = await buildEntriesAppWithRole('HORSE_OWNER');

    raceEntriesService.createEntry.mockResolvedValue({
      entryId: 3,
      raceId: 1,
      horseId: 2,
      jockeyId: 4,
      status: 'PENDING',
    });

    const res = await request(app)
      .post('/api/entries')
      .send({ raceId: 1, horseId: 2, jockeyId: 4 });

    expect(res.status).toBe(201);
    expect(res.body.entry.status).toBe('PENDING');
    expect(raceEntriesService.createEntry).toHaveBeenCalledWith(1, 2, 7, 4);
  });

  test('PUT /api/entries/:id/status approves entry for admin', async () => {
    const { app, raceEntriesService } = await buildEntriesAppWithRole('ADMIN');

    raceEntriesService.reviewEntry.mockResolvedValue({ entryId: 3, status: 'APPROVED' });

    const res = await request(app)
      .put('/api/entries/3/status')
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.entry.status).toBe('APPROVED');
    expect(raceEntriesService.reviewEntry).toHaveBeenCalledWith(3, {
      status: 'APPROVED',
      reason: undefined,
    }, 7);
  });

  test('PUT /api/entries/:id/status requires reason when rejecting', async () => {
    const { app, raceEntriesService } = await buildEntriesAppWithRole('ADMIN');

    const res = await request(app)
      .put('/api/entries/3/status')
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason/i);
    expect(raceEntriesService.reviewEntry).not.toHaveBeenCalled();
  });

  test('PUT /api/admin/races/:id/registration-gate closes gate and returns auto-reject count', async () => {
    const { app, raceEntriesService } = await buildAdminRacesAppWithRole('ADMIN');

    raceEntriesService.setRegistrationGate.mockResolvedValue({
      race: { raceId: 1, registrationOpen: false },
      autoRejectedCount: 2,
    });

    const res = await request(app)
      .put('/api/admin/races/1/registration-gate')
      .send({ isOpen: false });

    expect(res.status).toBe(200);
    expect(res.body.autoRejectedCount).toBe(2);
    expect(raceEntriesService.setRegistrationGate).toHaveBeenCalledWith(1, false);
  });

  test('PUT /api/admin/races/:id/registration-gate is forbidden for non-admin', async () => {
    const { app, raceEntriesService } = await buildAdminRacesAppWithRole('HORSE_OWNER');

    const res = await request(app)
      .put('/api/admin/races/1/registration-gate')
      .send({ isOpen: false });

    expect(res.status).toBe(403);
    expect(raceEntriesService.setRegistrationGate).not.toHaveBeenCalled();
  });
});
