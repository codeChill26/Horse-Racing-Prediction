// backend/src/dto/adminUser.dto.js

class AdminUserDtoValidator {
  validateListUsers(query) {
    const roleCode = (query.roleCode ?? query.role ?? '').toString().trim();

    if (roleCode === '') {
      return { roleCode: undefined };
    }

    return { roleCode };
  }

  validateCreateUser(body) {
    const email = (body?.email ?? '').toString().trim();
    const password = (body?.password ?? '').toString();
    const fullName = (body?.fullName ?? '').toString().trim();
    const phoneNumberRaw = body?.phoneNumber;
    const avatarUrlRaw = body?.avatarUrl;
    const roleCodeRaw = body?.roleCode;
    const roleIdRaw = body?.roleId;
    const licenseNumberRaw = body?.licenseNumber;
    const weightRaw = body?.weight;
    const bioRaw = body?.bio;

    if (!email || !email.includes('@')) throw new Error('Invalid email format');
    if (!password || password.length < 8) throw new Error('Password must be at least 8 characters long');
    if (!fullName) throw new Error('Full name is required');

    const roleId =
      roleIdRaw === undefined || roleIdRaw === null || roleIdRaw === ''
        ? undefined
        : Number(roleIdRaw);

    const roleCode =
      roleCodeRaw === undefined || roleCodeRaw === null
        ? undefined
        : String(roleCodeRaw).trim();

    if (roleId !== undefined) {
      if (!Number.isInteger(roleId) || roleId <= 0) {
        throw new Error('roleId must be a positive integer');
      }
    }

    const phoneNumber =
      phoneNumberRaw === undefined || phoneNumberRaw === null
        ? undefined
        : String(phoneNumberRaw).trim();

    const avatarUrl =
      avatarUrlRaw === undefined || avatarUrlRaw === null
        ? undefined
        : String(avatarUrlRaw).trim();

    const licenseNumber =
      licenseNumberRaw === undefined || licenseNumberRaw === null
        ? undefined
        : String(licenseNumberRaw).trim();

    const bio = bioRaw === undefined || bioRaw === null ? undefined : String(bioRaw).trim();

    let weight;
    if (weightRaw !== undefined && weightRaw !== null && weightRaw !== '') {
      const weightNum = Number(weightRaw);
      if (Number.isNaN(weightNum) || weightNum <= 0) {
        throw new Error('Weight must be a valid positive number');
      }
      weight = weightNum;
    }

    return {
      email,
      password,
      fullName,
      phoneNumber,
      avatarUrl,
      roleId,
      roleCode,
      licenseNumber,
      weight,
      bio,
    };
  }

  validateUpdateUser(body) {
    const fullNameRaw = body?.fullName;
    const phoneNumberRaw = body?.phoneNumber;
    const avatarUrlRaw = body?.avatarUrl;
    const licenseNumberRaw = body?.licenseNumber;
    const weightRaw = body?.weight;
    const bioRaw = body?.bio;
    const isProfileCompleteRaw = body?.isProfileComplete;
    const passwordRaw = body?.password;

    const fullName =
      fullNameRaw === undefined || fullNameRaw === null ? undefined : String(fullNameRaw).trim();
    if (fullName !== undefined && fullName === '') {
      throw new Error('Full name cannot be empty');
    }

    const phoneNumber =
      phoneNumberRaw === undefined || phoneNumberRaw === null
        ? undefined
        : String(phoneNumberRaw).trim();

    const avatarUrl =
      avatarUrlRaw === undefined || avatarUrlRaw === null
        ? undefined
        : String(avatarUrlRaw).trim();

    const licenseNumber =
      licenseNumberRaw === undefined || licenseNumberRaw === null
        ? undefined
        : String(licenseNumberRaw).trim();

    const bio = bioRaw === undefined || bioRaw === null ? undefined : String(bioRaw).trim();

    let weight;
    if (weightRaw !== undefined && weightRaw !== null && weightRaw !== '') {
      const weightNum = Number(weightRaw);
      if (Number.isNaN(weightNum) || weightNum <= 0) {
        throw new Error('Weight must be a valid positive number');
      }
      weight = weightNum;
    }

    let isProfileComplete;
    if (isProfileCompleteRaw !== undefined) {
      if (typeof isProfileCompleteRaw !== 'boolean') {
        throw new Error('isProfileComplete must be boolean');
      }
      isProfileComplete = isProfileCompleteRaw;
    }

    let password;
    if (passwordRaw !== undefined && passwordRaw !== null && passwordRaw !== '') {
      password = String(passwordRaw);
      if (password.length < 8) throw new Error('Password must be at least 8 characters long');
    }

    if (
      fullName === undefined &&
      phoneNumber === undefined &&
      avatarUrl === undefined &&
      licenseNumber === undefined &&
      weight === undefined &&
      bio === undefined &&
      isProfileComplete === undefined &&
      password === undefined
    ) {
      throw new Error('At least one field is required to update');
    }

    return {
      fullName,
      phoneNumber,
      avatarUrl,
      licenseNumber,
      weight,
      bio,
      isProfileComplete,
      password,
    };
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
