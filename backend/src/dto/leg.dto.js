// backend/src/dto/leg.dto.js

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

class LegDtoValidator {
  validateCreateLeg(body) {
    const name = (body?.name ?? '').toString().trim();
    if (!name) throw new Error('Leg name is required');

    const rawOrder = body?.legOrder;
    const legOrder = rawOrder === undefined || rawOrder === null || rawOrder === ''
      ? undefined
      : parsePositiveInt(rawOrder, 'legOrder');

    return { name, legOrder };
  }

  validateUpdateLeg(body) {
    const nameRaw = body?.name;
    const name = nameRaw === undefined || nameRaw === null ? undefined : String(nameRaw).trim();
    if (name !== undefined && name === '') throw new Error('name cannot be empty');

    const rawOrder = body?.legOrder;
    const legOrder = rawOrder === undefined || rawOrder === null || rawOrder === ''
      ? undefined
      : parsePositiveInt(rawOrder, 'legOrder');

    if (name === undefined && legOrder === undefined) {
      throw new Error('At least one field is required to update');
    }

    return { name, legOrder };
  }

  parseTournamentId(params) {
    return parsePositiveInt(params?.tournamentId, 'tournament id');
  }

  parseLegId(params) {
    return parsePositiveInt(params?.id, 'leg id');
  }
}

module.exports = new LegDtoValidator();
