const express = require('express');
const request = require('supertest');

async function buildApp() {
  jest.resetModules();

  jest.doMock('../src/services/tournaments', () => {
    return {
      listPublicTournaments: jest.fn(),
      getPublicTournamentById: jest.fn(),
    };
  });

  const router = require('../src/routes/tournaments');
  const tournamentsService = require('../src/services/tournaments');

  const app = express();
  app.use(express.json());
  app.use('/api/tournaments', router);

  return { app, tournamentsService };
}

describe('Public tournaments routes', () => {
  test('GET /api/tournaments returns list', async () => {
    const { app, tournamentsService } = await buildApp();

    tournamentsService.listPublicTournaments.mockResolvedValue([
      { tournamentId: 1, name: 'T1', status: 'OPEN' },
    ]);

    const res = await request(app).get('/api/tournaments');

    expect(res.status).toBe(200);
    expect(res.body.tournaments).toHaveLength(1);
    expect(tournamentsService.listPublicTournaments).toHaveBeenCalledTimes(1);
  });

  test('GET /api/tournaments/:id validates id', async () => {
    const { app, tournamentsService } = await buildApp();

    const res = await request(app).get('/api/tournaments/abc');

    expect(res.status).toBe(400);
    expect(tournamentsService.getPublicTournamentById).not.toHaveBeenCalled();
  });

  test('GET /api/tournaments/:id returns tournament', async () => {
    const { app, tournamentsService } = await buildApp();

    tournamentsService.getPublicTournamentById.mockResolvedValue({
      tournamentId: 2,
      name: 'T2',
      status: 'ONGOING',
    });

    const res = await request(app).get('/api/tournaments/2');

    expect(res.status).toBe(200);
    expect(res.body.tournament.tournamentId).toBe(2);
    expect(tournamentsService.getPublicTournamentById).toHaveBeenCalledWith(2);
  });
});
