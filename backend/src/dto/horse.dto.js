const HORSE_STATUSES = ['PENDING', 'APPROVED', 'REJECTED'];
const REVIEW_STATUSES = ['APPROVED', 'REJECTED'];

function normalizeStatus(input, allowedStatuses = HORSE_STATUSES) {
  if (input === undefined || input === null || input === '') return undefined;

  const status = String(input).trim().toUpperCase();
  if (!status) return undefined;
  if (status === 'ALL') return undefined;
  if (allowedStatuses.includes(status)) return status;

  throw new Error(`Invalid horse status. Allowed: ${allowedStatuses.join(', ')}`);
}

function parseOptionalDate(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} must be a valid date string`);
  }

  return date;
}

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

class HorseDtoValidator {
  validateCreateHorse(body) {
    const name = (body?.name ?? '').toString().trim();
    if (!name) throw new Error('Horse name is required');

    const optionalString = (value) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).trim();
      return normalized || undefined;
    };

    return {
      name,
      breed: optionalString(body?.breed),
      dateOfBirth: parseOptionalDate(body?.dateOfBirth, 'dateOfBirth'),
      sex: optionalString(body?.sex),
      color: optionalString(body?.color),
    };
  }

  validateListAdminHorses(query) {
    return {
      status: normalizeStatus(query?.status),
    };
  }

  validateReviewHorse(body) {
    const status = normalizeStatus(body?.status, REVIEW_STATUSES);
    if (!status) throw new Error('status is required');

    const reasonRaw = body?.reason ?? body?.rejectionReason;
    const reason =
      reasonRaw === undefined || reasonRaw === null ? undefined : String(reasonRaw).trim();

    if (status === 'REJECTED' && !reason) {
      throw new Error('reason is required when rejecting a horse');
    }

    return { status, reason };
  }

  validateEntry(body, params) {
    const raceId = parsePositiveInt(params?.raceId, 'race id');
    const horseId = parsePositiveInt(body?.horseId, 'horse id');
    return { raceId, horseId };
  }
}

module.exports = new HorseDtoValidator();
