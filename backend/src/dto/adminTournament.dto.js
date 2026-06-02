// backend/src/dto/adminTournament.dto.js

const ALLOWED_STATUSES = ['DRAFT', 'OPEN', 'ONGOING', 'FINISHED', 'CANCELLED'];

function normalizeStatus(input) {
  if (input === undefined || input === null || input === '') return undefined;

  const raw = String(input).trim();
  if (!raw) return undefined;

  const upper = raw.toUpperCase();

  // Allow both "Draft" and "DRAFT" styles
  if (ALLOWED_STATUSES.includes(upper)) return upper;

  throw new Error(`Invalid tournament status. Allowed: ${ALLOWED_STATUSES.join(', ')}`);
}

function parseOptionalDateTime(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid ISO datetime string`);
  }

  return date;
}

class AdminTournamentDtoValidator {
  validateListTournaments(query) {
    const status = normalizeStatus(query?.status ?? query?.tournamentStatus);
    return { status };
  }

  validateCreateTournament(body) {
    const name = (body?.name ?? '').toString().trim();
    const descriptionRaw = body?.description;

    if (!name) throw new Error('Tournament name is required');

    const description =
      descriptionRaw === undefined || descriptionRaw === null
        ? undefined
        : String(descriptionRaw).trim();

    const startAt = parseOptionalDateTime(body?.startAt, 'startAt');
    const endAt = parseOptionalDateTime(body?.endAt, 'endAt');

    if (startAt && endAt && startAt > endAt) {
      throw new Error('startAt must be <= endAt');
    }

    return { name, description, startAt, endAt };
  }

  validateUpdateTournament(body) {
    const nameRaw = body?.name;
    const descriptionRaw = body?.description;

    const name =
      nameRaw === undefined || nameRaw === null ? undefined : String(nameRaw).trim();
    if (name !== undefined && name === '') throw new Error('name cannot be empty');

    const description =
      descriptionRaw === undefined || descriptionRaw === null
        ? undefined
        : String(descriptionRaw).trim();

    const startAt = parseOptionalDateTime(body?.startAt, 'startAt');
    const endAt = parseOptionalDateTime(body?.endAt, 'endAt');

    if (startAt && endAt && startAt > endAt) {
      throw new Error('startAt must be <= endAt');
    }

    if (
      name === undefined &&
      description === undefined &&
      startAt === undefined &&
      endAt === undefined
    ) {
      throw new Error('At least one field is required to update');
    }

    return { name, description, startAt, endAt };
  }

  validateChangeStatus(body) {
    const status = normalizeStatus(body?.status);
    if (!status) throw new Error('status is required');

    const cancelReasonRaw = body?.cancelReason ?? body?.reason;
    const cancelReason =
      cancelReasonRaw === undefined || cancelReasonRaw === null
        ? undefined
        : String(cancelReasonRaw).trim();

    return { status, cancelReason };
  }

  validateDeleteTournament(req) {
    const reasonRaw = req?.body?.reason ?? req?.body?.cancelReason ?? req?.query?.reason;
    const reason =
      reasonRaw === undefined || reasonRaw === null ? undefined : String(reasonRaw).trim();

    if (reason !== undefined && reason === '') {
      throw new Error('reason cannot be empty');
    }

    return { reason };
  }
}

module.exports = new AdminTournamentDtoValidator();
