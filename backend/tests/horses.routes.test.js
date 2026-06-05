const express = require('express');
const request = require('supertest');

async function buildAppWithRole(roleCode) {
  jest.resetModules();

  jest.doMock('../src/middlewares/auth', () => {
    return (req, _res, next) => {
      req.user = { sub: 7, email: 'owner@example.com', role: roleCode };
      req.token = 'dummy';
      return next();
    };
  });

  jest.doMock('../src/services/horses', () => {
    return {
      createHorse: jest.fn(),
      listOwnerHorses: jest.fn(),
      listApprovedHorses: jest.fn(),
      getPublicHorseById: jest.fn(),
    };
  });

  const router = require('../src/routes/horses');
  const horsesService = require('../src/services/horses');

  const app = express();
  app.use(express.json());
  app.use('/api/horses', router);

  return { app, horsesService };
}

describe('Horse owner and public horse routes', () => {
  test('POST /api/horses creates pending horse for owner', async () => {
    const { app, horsesService } = await buildAppWithRole('HORSE_OWNER');

    horsesService.createHorse.mockResolvedValue({ horseId: 1, name: 'Storm', status: 'PENDING' });

    const res = await request(app)
      .post('/api/horses')
      .send({ name: 'Storm', breed: 'Arabian' });

    expect(res.status).toBe(201);
    expect(res.body.horse.status).toBe('PENDING');
    expect(horsesService.createHorse).toHaveBeenCalledWith(7, expect.objectContaining({
      name: 'Storm',
      breed: 'Arabian',
    }));
  });

  test('POST /api/horses is forbidden for non-owner', async () => {
    const { app, horsesService } = await buildAppWithRole('SPECTATOR');

    const res = await request(app)
      .post('/api/horses')
      .send({ name: 'Storm' });

    expect(res.status).toBe(403);
    expect(horsesService.createHorse).not.toHaveBeenCalled();
  });

  test('GET /api/horses lists approved public horses', async () => {
    const { app, horsesService } = await buildAppWithRole('SPECTATOR');

    horsesService.listApprovedHorses.mockResolvedValue([
      { horseId: 1, name: 'Storm', status: 'APPROVED', careerMetrics: { winRate: 50 } },
    ]);

    const res = await request(app).get('/api/horses');

    expect(res.status).toBe(200);
    expect(res.body.horses).toHaveLength(1);
    expect(horsesService.listApprovedHorses).toHaveBeenCalledTimes(1);
  });
});
