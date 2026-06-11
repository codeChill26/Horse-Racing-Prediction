// backend/src/dto/race.dto.js

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
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

    const legIdRaw = body?.legId;
    const legId = legIdRaw === undefined || legIdRaw === null || legIdRaw === ''
      ? undefined
      : parsePositiveInt(legIdRaw, 'legId');

    const scheduledAt = parseOptionalDateTime(body?.scheduledAt, 'scheduledAt');
    const registrationDeadline = parseOptionalDateTime(body?.registrationDeadline, 'registrationDeadline');

    return { name, legId, scheduledAt, registrationDeadline };
  }

  validateUpdateRace(body) {
    const nameRaw = body?.name;
    const name = nameRaw === undefined || nameRaw === null ? undefined : String(nameRaw).trim();
    if (name !== undefined && name === '') throw new Error('name cannot be empty');

    const legIdRaw = body?.legId;
    const legId = legIdRaw === undefined || legIdRaw === null || legIdRaw === ''
      ? undefined
      : parsePositiveInt(legIdRaw, 'legId');

    const scheduledAt = parseOptionalDateTime(body?.scheduledAt, 'scheduledAt');
    const registrationDeadline = parseOptionalDateTime(body?.registrationDeadline, 'registrationDeadline');

    if (name === undefined && legId === undefined && scheduledAt === undefined && registrationDeadline === undefined) {
      throw new Error('At least one field is required to update');
    }

    return { name, legId, scheduledAt, registrationDeadline };
  }

  parseRaceId(params) {
    return parsePositiveInt(params?.id, 'race id');
  }

  parseTournamentId(params) {
    return parsePositiveInt(params?.tournamentId, 'tournament id');
  }
}

module.exports = new RaceDtoValidator();
