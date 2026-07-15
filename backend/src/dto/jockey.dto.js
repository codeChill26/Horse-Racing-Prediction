// backend/src/dto/jockey.dto.js

class JockeyDtoValidator {
  validateUpdateProfile(body) {
    const phoneRaw = body?.phone ?? body?.phoneNumber;
    const dateOfBirthRaw = body?.dateOfBirth;

    if (phoneRaw === undefined && dateOfBirthRaw === undefined) {
      throw new Error('At least one of phone or dateOfBirth is required');
    }

    const phone = phoneRaw === undefined || phoneRaw === null
      ? undefined
      : String(phoneRaw).trim();
    if (phone !== undefined && phone === '') {
      throw new Error('Phone cannot be empty');
    }

    let dateOfBirth;
    if (dateOfBirthRaw !== undefined && dateOfBirthRaw !== null && dateOfBirthRaw !== '') {
      const date = new Date(dateOfBirthRaw);
      if (Number.isNaN(date.getTime())) {
        throw new Error('dateOfBirth must be a valid date');
      }
      dateOfBirth = date;
    }

    return { phone, dateOfBirth };
  }

  validateRespondInvitation(body) {
    const status = body?.status;
    const declineReason = body?.declineReason;

    if (!status || !['ACCEPTED', 'DECLINED'].includes(status)) {
      throw new Error('Status must be either ACCEPTED or DECLINED');
    }

    if (status === 'DECLINED') {
      if (!declineReason || String(declineReason).trim() === '') {
        throw new Error('declineReason is required when declining an invitation');
      }
    }

    return {
      status,
      declineReason: status === 'DECLINED' ? String(declineReason).trim() : null,
    };
  }

  parsePagination(query) {
    const pageRaw = query?.page;
    const pageSizeRaw = query?.pageSize;

    const page = pageRaw === undefined || pageRaw === '' ? 1 : Number(pageRaw);
    const pageSize = pageSizeRaw === undefined || pageSizeRaw === '' ? 20 : Number(pageSizeRaw);

    if (!Number.isInteger(page) || page < 1) {
      throw new Error('page must be a positive integer');
    }
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new Error('pageSize must be between 1 and 100');
    }

    return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
  }
}

module.exports = new JockeyDtoValidator();
