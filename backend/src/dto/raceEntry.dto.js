const ENTRY_REVIEW_STATUSES = ['APPROVED', 'REJECTED'];

function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

function normalizeEntryStatus(input) {
  if (input === undefined || input === null || input === '') return undefined;

  const status = String(input).trim().toUpperCase();
  if (!ENTRY_REVIEW_STATUSES.includes(status)) {
    throw new Error(`Invalid entry status. Allowed: ${ENTRY_REVIEW_STATUSES.join(', ')}`);
  }
  return status;
}

class RaceEntryDtoValidator {
  validateCreateEntry(body, params = {}) {
    const raceId = parsePositiveInt(params?.raceId ?? body?.raceId, 'race id');
    const horseId = parsePositiveInt(body?.horseId, 'horse id');
    const jockeyId =
      body?.jockeyId === undefined || body?.jockeyId === null || body?.jockeyId === ''
        ? undefined
        : parsePositiveInt(body.jockeyId, 'jockey id');

    return { raceId, horseId, jockeyId };
  }

  validateReviewEntry(body) {
    const status = normalizeEntryStatus(body?.status);
    if (!status) throw new Error('status is required');

    const reasonRaw = body?.reason ?? body?.rejectionReason;
    const reason =
      reasonRaw === undefined || reasonRaw === null ? undefined : String(reasonRaw).trim();

    if (status === 'REJECTED' && !reason) {
      throw new Error('reason is required when rejecting a race entry');
    }

    const optionalNonNegativeInt = (value, fieldName) => {
      if (value === undefined || value === null || value === '') return undefined;
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(`${fieldName} must be a non-negative integer`);
      }
      return parsed;
    };

    const weightLb = optionalNonNegativeInt(body?.weightLb, 'weightLb');
    const saddleNumber = optionalNonNegativeInt(body?.saddleNumber, 'saddleNumber');

    return { status, reason, weightLb, saddleNumber };
  }

  validateRegistrationGate(body) {
    const raw = body?.isOpen ?? body?.registrationOpen ?? body?.open;
    if (typeof raw !== 'boolean') {
      throw new Error('isOpen must be boolean');
    }
    return { isOpen: raw };
  }

  parseEntryId(params) {
    return parsePositiveInt(params?.id, 'entry id');
  }

  parseRaceId(params) {
    return parsePositiveInt(params?.id ?? params?.raceId, 'race id');
  }
}

module.exports = new RaceEntryDtoValidator();
