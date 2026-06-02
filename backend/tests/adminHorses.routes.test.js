const express = require('express');
const request = require('supertest');

async function buildAppWithRole(roleCode) {
  jest.resetModules();

  jest.doMock('../src/middlewares/auth', () => {
    return (req, _res, next) => {
      req.user = { sub: 1, email: 'admin@example.com', role: roleCode };
      req.token = 'dummy';
      return next();
    };
  });

  jest.doMock('../src/services/horses', () => {
    return {
      listAdminHorses: jest.fn(),
      getAdminHorseById: jest.fn(),
      reviewHorse: jest.fn(),
    };
  });

  const router = require('../src/routes/admin/horses');
  const horsesService = require('../src/services/horses');

  const app = express();
  app.use(express.json());
  app.use('/api/admin/horses', router);

  return { app, horsesService };
}

describe('Admin horses routes', () => {
  test('GET /api/admin/horses forwards status filter', async () => {
    const { app, horsesService } = await buildAppWithRole('ADMIN');

    horsesService.listAdminHorses.mockResolvedValue([{ horseId: 1, status: 'PENDING' }]);

    const res = await request(app).get('/api/admin/horses?status=PENDING');

    expect(res.status).toBe(200);
    expect(res.body.horses).toHaveLength(1);
    expect(horsesService.listAdminHorses).toHaveBeenCalledWith({ status: 'PENDING' });
  });

  test('PATCH /api/admin/horses/:id/status requires reason for reject', async () => {
    const { app, horsesService } = await buildAppWithRole('ADMIN');

    const res = await request(app)
      .patch('/api/admin/horses/1/status')
      .send({ status: 'REJECTED' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/reason/i);
    expect(horsesService.reviewHorse).not.toHaveBeenCalled();
  });

  test('PATCH /api/admin/horses/:id/status approves horse', async () => {
    const { app, horsesService } = await buildAppWithRole('ADMIN');

    horsesService.reviewHorse.mockResolvedValue({ horseId: 1, status: 'APPROVED' });

    const res = await request(app)
      .patch('/api/admin/horses/1/status')
      .send({ status: 'APPROVED' });

    expect(res.status).toBe(200);
    expect(res.body.horse.status).toBe('APPROVED');
    expect(horsesService.reviewHorse).toHaveBeenCalledWith(1, {
      status: 'APPROVED',
      reason: undefined,
    }, 1);
  });

  test('GET /api/admin/horses is forbidden for non-admin', async () => {
    const { app, horsesService } = await buildAppWithRole('HORSE_OWNER');

    const res = await request(app).get('/api/admin/horses');

    expect(res.status).toBe(403);
    expect(horsesService.listAdminHorses).not.toHaveBeenCalled();
  });
});
