// backend/src/dto/race.dto.js

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

function parseOptionalPositiveInt(value, fieldName, maxValue) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  if (maxValue !== undefined && parsed > maxValue) {
    throw new Error(`${fieldName} cannot exceed ${maxValue}`);
  }
  return parsed;
}

function parseOptionalDateTime(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO datetime string`);
  }

  return date;
}

class RaceDtoValidator {
  validateCreateRace(body) {
    const name = (body?.name ?? '').toString().trim();
    if (!name) throw new Error('Race name is required');

    const maxEntries = parseOptionalPositiveInt(body?.maxEntries, 'maxEntries');

    const scheduledAt = parseOptionalDateTime(body?.scheduledAt, 'scheduledAt');
    const registrationDeadline = parseOptionalDateTime(body?.registrationDeadline, 'registrationDeadline');

    return { name, maxEntries, scheduledAt, registrationDeadline };
  }

  validateUpdateRace(body) {
    const nameRaw = body?.name;
    const name = nameRaw === undefined || nameRaw === null ? undefined : String(nameRaw).trim();
    if (name !== undefined && name === '') throw new Error('name cannot be empty');

    const maxEntries = parseOptionalPositiveInt(body?.maxEntries, 'maxEntries');

    const scheduledAt = parseOptionalDateTime(body?.scheduledAt, 'scheduledAt');
    const registrationDeadline = parseOptionalDateTime(body?.registrationDeadline, 'registrationDeadline');

    if (name === undefined && maxEntries === undefined && scheduledAt === undefined && registrationDeadline === undefined) {
      throw new Error('At least one field is required to update');
    }

    return { name, maxEntries, scheduledAt, registrationDeadline };
  }

  parseRaceId(params) {
    return parsePositiveInt(params?.id, 'race id');
  }

  parseTreasury(query) {
    const raw = query?.treasury;
    if (raw === undefined || raw === null || raw === '') {
      throw new Error('treasury query parameter is required');
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      throw new Error('treasury must be a non-negative number');
    }
    return parsed;
  }

  parseTournamentId(params) {
    return parsePositiveInt(params?.tournamentId, 'tournament id');
  }
}

module.exports = new RaceDtoValidator();
