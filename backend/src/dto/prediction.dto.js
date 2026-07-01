const VALID_BET_TYPES = ['WIN', 'PLACE', 'SHOW', 'QUINELLA', 'EXACTA'];

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

    const betType = body?.betType;
    if (!betType || !VALID_BET_TYPES.includes(betType)) {
      throw new Error(`betType must be one of: ${VALID_BET_TYPES.join(', ')}`);
    }

    if (!body?.entryIds || !Array.isArray(body.entryIds)) {
      throw new Error('entryIds must be an array of entry IDs');
    }

    if (['WIN', 'PLACE', 'SHOW'].includes(betType)) {
      if (body.entryIds.length !== 1) {
        throw new Error(`${betType} bet requires exactly 1 entry`);
      }
    } else if (['QUINELLA', 'EXACTA'].includes(betType)) {
      if (body.entryIds.length !== 2) {
        throw new Error(`${betType} bet requires exactly 2 entries`);
      }
    }

    const entryIds = [...new Set(body.entryIds.map((id) => parsePositiveInt(id, 'entry id')))];

    if (['QUINELLA', 'EXACTA'].includes(betType) && entryIds.length !== 2) {
      throw new Error('The 2 selected entries must be different');
    }

    const betAmount = parsePositiveInt(body?.betAmount, 'bet amount');
    if (betAmount < 10) {
      throw new Error('Minimum bet amount is 10 points');
    }

    return { spectatorId, raceId, betType, entryIds, betAmount };
  }

  validateCancelPrediction(params) {
    return parsePositiveInt(params?.id, 'prediction id');
  }

}

module.exports = new PredictionDtoValidator();
