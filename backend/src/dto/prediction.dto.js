function parsePositiveInt(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return parsed;
}

class PredictionDtoValidator {
  validatePlaceBet(body, userId) {
    const spectatorId = parsePositiveInt(userId, 'user id');

    const raceId = parsePositiveInt(body?.raceId, 'race id');

    if (!body?.entryIds || !Array.isArray(body.entryIds) || body.entryIds.length !== 3) {
      throw new Error('entryIds must be an array of exactly 3 entry IDs');
    }

    const entryIds = [...new Set(body.entryIds.map((id) => parsePositiveInt(id, 'entry id')))];

    if (entryIds.length !== 3) {
      throw new Error('All 3 selected entries must be different');
    }

    const betAmount = parsePositiveInt(body?.betAmount, 'bet amount');
    if (betAmount < 10) {
      throw new Error('Minimum bet amount is 10 points');
    }

    return { spectatorId, raceId, entryIds, betAmount };
  }

  validateCancelPrediction(params) {
    return parsePositiveInt(params?.id, 'prediction id');
  }

  validatePublishResults(params) {
    return parsePositiveInt(params?.id, 'race id');
  }

  validateUnpublishResults(params) {
    return parsePositiveInt(params?.id, 'race id');
  }
}

module.exports = new PredictionDtoValidator();
