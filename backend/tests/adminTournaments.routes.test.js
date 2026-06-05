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

  jest.doMock('../src/services/adminTournaments', () => {
    return {
      listTournaments: jest.fn(),
      getTournamentById: jest.fn(),
      createTournament: jest.fn(),
      updateTournament: jest.fn(),
      changeStatus: jest.fn(),
      deleteTournament: jest.fn(),
    };
  });

  const router = require('../src/routes/admin/tournaments');
  const adminTournamentsService = require('../src/services/adminTournaments');

  const app = express();
  app.use(express.json());
  app.use('/api/admin/tournaments', router);

  return { app, adminTournamentsService };
}

describe('Admin tournaments routes', () => {
  test('GET /api/admin/tournaments returns list (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.listTournaments.mockResolvedValue([
      { tournamentId: 1, name: 'T1', status: 'DRAFT', _count: { races: 0 } },
    ]);

    const res = await request(app).get('/api/admin/tournaments');

    expect(res.status).toBe(200);
    expect(res.body.tournaments).toHaveLength(1);
    expect(adminTournamentsService.listTournaments).toHaveBeenCalledWith({ status: undefined });
  });

  test('GET /api/admin/tournaments forwards status filter (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.listTournaments.mockResolvedValue([]);

    const res = await request(app).get('/api/admin/tournaments?status=OPEN');

    expect(res.status).toBe(200);
    expect(adminTournamentsService.listTournaments).toHaveBeenCalledWith({ status: 'OPEN' });
  });

  test('GET /api/admin/tournaments treats status=ALL as no filter (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.listTournaments.mockResolvedValue([]);

    const res = await request(app).get('/api/admin/tournaments?status=ALL');

    expect(res.status).toBe(200);
    expect(adminTournamentsService.listTournaments).toHaveBeenCalledWith({ status: undefined });
  });

  test('GET /api/admin/tournaments/:id returns tournament (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.getTournamentById.mockResolvedValue({
      tournamentId: 1,
      name: 'T1',
      status: 'DRAFT',
      _count: { races: 0 },
    });

    const res = await request(app).get('/api/admin/tournaments/1');

    expect(res.status).toBe(200);
    expect(res.body.tournament.tournamentId).toBe(1);
    expect(adminTournamentsService.getTournamentById).toHaveBeenCalledWith(1);
  });

  test('GET /api/admin/tournaments is forbidden (non-ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('SPECTATOR');

    const res = await request(app).get('/api/admin/tournaments');

    expect(res.status).toBe(403);
    expect(adminTournamentsService.listTournaments).not.toHaveBeenCalled();
  });

  test('POST /api/admin/tournaments creates tournament (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.createTournament.mockResolvedValue({
      tournamentId: 1,
      name: 'T1',
      status: 'DRAFT',
      _count: { races: 0 },
    });

    const res = await request(app)
      .post('/api/admin/tournaments')
      .send({ name: 'T1' });

    expect(res.status).toBe(201);
    expect(res.body.tournament.tournamentId).toBe(1);
    expect(adminTournamentsService.createTournament).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'T1' })
    );
  });

  test('PATCH /api/admin/tournaments/:id/status requires status', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    const res = await request(app)
      .patch('/api/admin/tournaments/1/status')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/status/i);
    expect(adminTournamentsService.changeStatus).not.toHaveBeenCalled();
  });

  test('PATCH /api/admin/tournaments/:id updates tournament (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.updateTournament.mockResolvedValue({
      tournamentId: 1,
      name: 'Updated',
      status: 'OPEN',
      _count: { races: 0 },
    });

    const res = await request(app)
      .patch('/api/admin/tournaments/1')
      .send({ name: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body.tournament.name).toBe('Updated');
    expect(adminTournamentsService.updateTournament).toHaveBeenCalledWith(1, {
      name: 'Updated',
      description: undefined,
      startAt: undefined,
      endAt: undefined,
    });
  });

  test('PATCH /api/admin/tournaments/:id/status changes status (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.changeStatus.mockResolvedValue({
      tournamentId: 1,
      name: 'T1',
      status: 'OPEN',
      _count: { races: 0 },
    });

    const res = await request(app)
      .patch('/api/admin/tournaments/1/status')
      .send({ status: 'OPEN' });

    expect(res.status).toBe(200);
    expect(res.body.tournament.status).toBe('OPEN');
    expect(adminTournamentsService.changeStatus).toHaveBeenCalledWith(1, {
      status: 'OPEN',
      cancelReason: undefined,
    });
  });

  test('DELETE /api/admin/tournaments/:id forwards reason (ADMIN)', async () => {
    const { app, adminTournamentsService } = await buildAppWithRole('ADMIN');

    adminTournamentsService.deleteTournament.mockResolvedValue({ action: 'DELETED' });

    const res = await request(app)
      .delete('/api/admin/tournaments/1?reason=test')
      .send();

    expect(res.status).toBe(200);
    expect(adminTournamentsService.deleteTournament).toHaveBeenCalledWith(1, { reason: 'test' });
  });
});
