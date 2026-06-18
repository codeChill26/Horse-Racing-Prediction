// backend/src/dto/owner.dto.js

function parseOptionalPositiveInt(value, fieldName) {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

function normalizeEntryStatus(input) {
  if (input === undefined || input === null || input === '') return undefined;
  const status = String(input).trim().toUpperCase();
  if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
    throw new Error('Invalid status filter. Allowed: PENDING, APPROVED, REJECTED');
  }
  return status;
}

class OwnerDtoValidator {
  validateListMyEntries(query) {
    const raceId = parseOptionalPositiveInt(query?.raceId, 'raceId');
    const status = normalizeEntryStatus(query?.status);
    return { raceId, status };
  }

  validateListRaceEntries(query) {
    return {};
  }

  validateListOpenRaces(query) {
    return {};
  }
}

module.exports = new OwnerDtoValidator();
