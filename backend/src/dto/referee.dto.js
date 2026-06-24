/**
 * Validate dữ liệu nộp kết quả của Trọng tài (Blind Submission)
 */
function validateRefereeSubmission(body) {
  const { rawResults } = body;

  if (!rawResults || !Array.isArray(rawResults)) {
    return { valid: false, error: 'Dữ liệu rawResults bắt buộc phải là một mảng (Array).' };
  }

  if (rawResults.length === 0) {
    return { valid: false, error: 'Mảng kết quả không được để trống.' };
  }

  for (const item of rawResults) {
    if (item.entryId === undefined || item.entryId === null) {
      return { valid: false, error: 'Mỗi phần tử kết quả bắt buộc phải có entryId.' };
    }
    if (item.rank === undefined || item.rank === null) {
      return { valid: false, error: 'Mỗi phần tử kết quả bắt buộc phải có rank (Thứ hạng).' };
    }
    if (typeof item.isDnf !== 'boolean' || typeof item.isDq !== 'boolean') {
      return { valid: false, error: 'Trường trạng thái isDnf và isDq phải là kiểu Boolean (true/false).' };
    }
  }

  return { valid: true, error: null };
}

/**
 * Validate dữ liệu gán Trọng tài vào trận đấu của Admin
 */
function validateAssignReferees(body) {
  const { refereeAId, refereeBId } = body;

  if (!refereeAId || !refereeBId) {
    return { valid: false, error: 'Bắt buộc phải truyền đủ cả refereeAId và refereeBId.' };
  }

  if (parseInt(refereeAId) === parseInt(refereeBId)) {
    return { valid: false, error: 'Trọng tài A và Trọng tài B không được trùng nhau.' };
  }

  return { valid: true, error: null };
}

/**
 * Validate dữ liệu xử lý xung đột kết quả của Admin (Resolve Conflict)
 */
function validateResolveConflict(body) {
  const { finalResults, reason } = body;

  if (!finalResults || !Array.isArray(finalResults) || finalResults.length === 0) {
    return { valid: false, error: 'Kết quả cuối cùng finalResults bắt buộc phải là một mảng dữ liệu xếp hạng.' };
  }

  if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
    return { valid: false, error: 'Lý do bắt buộc nhập (reason) và phải có độ dài ít nhất 5 ký tự.' };
  }

  return { valid: true, error: null };
}

module.exports = {
  validateRefereeSubmission,
  validateAssignReferees,
  validateResolveConflict
};