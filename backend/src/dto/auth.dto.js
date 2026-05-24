
class AuthDtoValidator {
  validateRegister(body) {
    const { email, password, fullName, phoneNumber, roleCode } = body;

    if (!email || !email.includes('@')) throw new Error('Invalid email format');
    if (!password || password.length < 8) throw new Error('Password must be at least 8 characters long');
    if (!fullName || fullName.trim() === '') throw new Error('Full name is required');
    if (!phoneNumber) throw new Error('Phone number is required');
    
    // Hệ thống chỉ cho phép các vai trò người dùng public tự đăng ký
    const validRoles = ['HORSE_OWNER', 'JOCKEY', 'SPECTATOR'];
    if (!roleCode || !validRoles.includes(roleCode)) {
      throw new Error('Invalid role selection. Must be HORSE_OWNER, JOCKEY, or SPECTATOR');
    }

    return body;
  }

  // Kiểm tra dữ liệu Yêu cầu Đặt lại Mật khẩu (Reset Password Payloads)
  validateResetPassword(body) {
    const { email, otpCode, newPassword, confirmPassword } = body;

    if (!email || !otpCode) throw new Error('Email and OTP code are required');
    if (otpCode.length !== 6) throw new Error('OTP must be exactly 6 digits');
    if (!newPassword || newPassword.length < 8) throw new Error('New password must be at least 8 characters long');
    if (newPassword !== confirmPassword) throw new Error('Password and confirm password do not match');

    return body;
  }

  validateUpdateProfile(body) {
    const { fullName, oldPassword, newPassword, weight } = body;

    if (fullName !== undefined && fullName.trim() === '') {
      throw new Error('Full name cannot be empty');
    }

    // Nếu muốn đổi mật khẩu, bắt buộc phải truyền kèm mật khẩu cũ
    if (newPassword) {
      if (!oldPassword) throw new Error('Old password is required to set a new password');
      if (newPassword.length < 8) throw new Error('New password must be at least 8 characters long');
    }

    // Nếu cập nhật cân nặng (Dành cho Jockey)
    if (weight !== undefined) {
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum <= 0) {
        throw new Error('Weight must be a valid positive number');
      }
    }

    return body;
  }
}

module.exports = new AuthDtoValidator();