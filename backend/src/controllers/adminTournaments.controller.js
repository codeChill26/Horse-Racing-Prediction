// backend/src/controllers/adminTournaments.controller.js

const adminTournamentsService = require('../services/adminTournaments');
const validator = require('../dto/adminTournament.dto');

async function listTournaments(req, res) {
  try {
    const { status } = validator.validateListTournaments(req.query);
    const tournaments = await adminTournamentsService.listTournaments({ status });
    return res.status(200).json({ tournaments });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function getTournamentById(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }

    const tournament = await adminTournamentsService.getTournamentById(tournamentId);
    return res.status(200).json({ tournament });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function createTournament(req, res) {
  try {
    const validatedBody = validator.validateCreateTournament(req.body);
    const tournament = await adminTournamentsService.createTournament(validatedBody);
    return res.status(201).json({ message: 'Tournament created successfully', tournament });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function updateTournament(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }

    const validatedBody = validator.validateUpdateTournament(req.body);
    const tournament = await adminTournamentsService.updateTournament(tournamentId, validatedBody);
    return res.status(200).json({ message: 'Tournament updated successfully', tournament });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function changeStatus(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }

    const validatedBody = validator.validateChangeStatus(req.body);
    const tournament = await adminTournamentsService.changeStatus(tournamentId, validatedBody);

    return res.status(200).json({ message: 'Tournament status updated successfully', tournament });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function deleteTournament(req, res) {
  try {
    const tournamentId = Number(req.params.id);
    if (!Number.isInteger(tournamentId) || tournamentId <= 0) {
      return res.status(400).json({ error: 'Invalid tournament id' });
    }

    const { reason } = validator.validateDeleteTournament(req);
    const result = await adminTournamentsService.deleteTournament(tournamentId, { reason });

    if (result.action === 'DELETED') {
      return res.status(200).json({ message: 'Tournament deleted successfully' });
    }

    return res.status(200).json({
      message: 'Tournament contains races; cancelled instead of deleting',
      tournament: result.tournament,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

module.exports = {
  listTournaments,
  getTournamentById,
  createTournament,
  updateTournament,
  changeStatus,
  deleteTournament,
};
