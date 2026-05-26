// backend/src/dto/adminUser.dto.js

class AdminUserDtoValidator {
  validateListUsers(query) {
    const roleCode = (query.roleCode ?? query.role ?? '').toString().trim();

    if (roleCode === '') {
      return { roleCode: undefined };
    }

    return { roleCode };
  }

  validateChangeRole(body) {
    const roleIdRaw = body?.roleId;
    const roleCodeRaw = body?.roleCode;
    const confirm = body?.confirm;

    const roleId =
      roleIdRaw === undefined || roleIdRaw === null || roleIdRaw === ''
        ? undefined
        : Number(roleIdRaw);

    const roleCode =
      roleCodeRaw === undefined || roleCodeRaw === null
        ? undefined
        : String(roleCodeRaw).trim();

    if (!confirm) {
      throw new Error('Confirmation required: pass { confirm: true } to change role.');
    }

    if (roleId !== undefined) {
      if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new Error('roleId must be a positive integer');
      }
      return { roleId, roleCode: undefined, confirm: true };
    }

    if (!roleCode) {
      throw new Error('roleCode or roleId is required');
    }

    return { roleId: undefined, roleCode, confirm: true };
  }
}

module.exports = new AdminUserDtoValidator();
