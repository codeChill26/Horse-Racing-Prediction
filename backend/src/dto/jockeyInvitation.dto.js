// backend/src/dto/jockeyInvitation.dto.js

class JockeyInvitationDtoValidator {
  validateSendInvitation(body) {
    const { raceId, horseId, jockeyId } = body;
    if (!raceId || !Number.isInteger(raceId)) throw new Error('Valid raceId is required');
    if (!horseId || !Number.isInteger(horseId)) throw new Error('Valid horseId is required');
    if (!jockeyId || !Number.isInteger(jockeyId)) throw new Error('Valid jockeyId is required');
    return body;
  }

  validateRespondInvitation(body) {
    const { status, declineReason } = body;
    const allowedStatuses = ['ACCEPTED', 'DECLINED'];
    if (!status || !allowedStatuses.includes(status)) {
      throw new Error('Status must be either ACCEPTED or DECLINED');
    }
    if (status === 'DECLINED' && (!declineReason || declineReason.trim() === '')) {
      throw new Error('Decline reason is required when declining an invitation');
    }
    return body;
  }
}

module.exports = new JockeyInvitationDtoValidator();