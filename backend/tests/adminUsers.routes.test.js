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

  jest.doMock('../src/services/adminUsers', () => {
    return {
      listUsers: jest.fn(),
      toggleIsActive: jest.fn(),
      changeRole: jest.fn(),
    };
  });

  const router = require('../routes/admin/users');
  const adminUsersService = require('../src/services/adminUsers');

  const app = express();
  app.use(express.json());
  app.use('/api/admin/users', router);

  return { app, adminUsersService };
}

describe('Admin users routes', () => {
  test('GET /api/admin/users returns list (ADMIN)', async () => {
    const { app, adminUsersService } = await buildAppWithRole('ADMIN');

    adminUsersService.listUsers.mockResolvedValue([
      {
        userId: 10,
        email: 'u@example.com',
        fullName: 'User',
        isActive: true,
        role: { roleId: 1, code: 'SPECTATOR', name: 'Spectator' },
      },
    ]);

    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(200);
    expect(res.body.users).toHaveLength(1);
    expect(adminUsersService.listUsers).toHaveBeenCalledTimes(1);
  });

  test('GET /api/admin/users is forbidden (non-ADMIN)', async () => {
    const { app, adminUsersService } = await buildAppWithRole('SPECTATOR');

    const res = await request(app).get('/api/admin/users');

    expect(res.status).toBe(403);
    expect(adminUsersService.listUsers).not.toHaveBeenCalled();
  });

  test('PATCH /api/admin/users/:id/toggle-active toggles (ADMIN)', async () => {
    const { app, adminUsersService } = await buildAppWithRole('ADMIN');

    adminUsersService.toggleIsActive.mockResolvedValue({
      userId: 10,
      email: 'u@example.com',
      fullName: 'User',
      isActive: false,
      role: { roleId: 1, code: 'SPECTATOR', name: 'Spectator' },
      updatedAt: new Date().toISOString(),
    });

    const res = await request(app).patch('/api/admin/users/10/toggle-active');

    expect(res.status).toBe(200);
    expect(res.body.user.isActive).toBe(false);
    expect(adminUsersService.toggleIsActive).toHaveBeenCalledWith(10);
  });

  test('PATCH /api/admin/users/:id/role requires confirm', async () => {
    const { app, adminUsersService } = await buildAppWithRole('ADMIN');

    const res = await request(app)
      .patch('/api/admin/users/10/role')
      .send({ roleCode: 'JOCKEY' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/confirm/i);
    expect(adminUsersService.changeRole).not.toHaveBeenCalled();
  });

  test('PATCH /api/admin/users/:id/role updates when confirmed', async () => {
    const { app, adminUsersService } = await buildAppWithRole('ADMIN');

    adminUsersService.changeRole.mockResolvedValue({
      userId: 10,
      email: 'u@example.com',
      fullName: 'User',
      isActive: true,
      role: { roleId: 2, code: 'JOCKEY', name: 'Jockey' },
      updatedAt: new Date().toISOString(),
    });

    const res = await request(app)
      .patch('/api/admin/users/10/role')
      .send({ roleCode: 'JOCKEY', confirm: true });

    expect(res.status).toBe(200);
    expect(res.body.user.role.code).toBe('JOCKEY');
    expect(adminUsersService.changeRole).toHaveBeenCalledWith(10, {
      roleId: undefined,
      roleCode: 'JOCKEY',
    });
  });
});
