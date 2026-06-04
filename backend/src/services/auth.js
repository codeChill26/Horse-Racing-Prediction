const prisma = require('../config/prisma');
const redisClient = require('../config/redis');
const mailerTransporter = require('../config/mailer');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

class AuthService {
  
  // 1. NGHIỆP VỤ ĐĂNG KÝ TÀI KHOẢN (User Registration & Initial Transaction)
  async register(data) {
    const existingUser = await prisma.user.findUnique({ 
      where: { email: data.email } 
    });
    
    if (existingUser) 
      throw new Error(`Email already exists within the system: ${data.email}`);

    const role = await prisma.role.findUnique(
      { where: { code: data.roleCode } 
    });
    
    if (!role) 
      throw new Error('Requested Role not found in database.');

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // Kích hoạt Database Transaction toàn cục (Atomic database operation)
    return await prisma.$transaction(async (tx) => {
      const isJockey = data.roleCode === 'JOCKEY';
      // Hồ sơ Jockey chỉ hoàn thành khi điền đầy đủ số chứng chỉ hành nghề và cân nặng
      const isProfileComplete = isJockey ? (!!data.licenseNumber && !!data.weight) : true;

      // Tạo hồ sơ người dùng mới
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          fullName: data.fullName,
          phoneNumber: data.phoneNumber,
          roleId: role.roleId,
          isActive: true,
          lockedUntil: null, // Mặc định ban đầu không bị khóa
          licenseNumber: data.licenseNumber,
          weight: data.weight,
          bio: data.bio,
          isProfileComplete: isProfileComplete
        }
      });

      // Nếu người đăng ký là Spectator, tự động tạo ví điểm thưởng khởi tạo 100 điểm
      if (data.roleCode === 'SPECTATOR') {
        const wallet = await tx.pointWallet.create({
          data: { 
            userId: user.userId, 
            balance: 100, // Cập nhật số dư ban đầu
            isFrozen: 0   // Trạng thái ví bình thường
          }
        });

        // Tạo bản ghi biến động số dư chi tiết kết nối trực tiếp với ví điểm
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.walletId,
            amount: 100,
            balanceAfter: 100, // Khớp số dư sau khi giao dịch thành công
            referenceType: 'SYSTEM_REGISTRATION',
            referenceId: null,
            type: 'INITIAL_BONUS',
            description: 'Received 100 points initial signup reward'
          }
        });
      }

      const { passwordHash, ...userResponse } = user;
      return userResponse;
    });
  }

  // 2. NGHIỆP VỤ ĐĂNG NHẬP (User Authentication & Locked Time Check)
  async login(email, password) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true }
    });
    
    if (!user) throw new Error('Invalid email or password');
    if (!user.isActive) throw new Error('This account has been deactivated.');

    // Kiểm tra nghiệp vụ khóa tài khoản tạm thời (lockedUntil)
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      throw new Error(`Account is temporarily locked until: ${user.lockedUntil.toLocaleString()}`);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new Error('Invalid email or password');

    // A. Ký JWT Access Token mã hóa phân quyền với thời gian sống 60 phút (60m)
    const accessToken = jwt.sign(
      { sub: user.userId, email: user.email, role: user.role.code },
      process.env.JWT_SECRET,
      { expiresIn: '60m' }
    );

    // B. BỔ SUNG: Sinh mã Refresh Token dự phòng (Thời hạn sống 7 ngày)
    const refreshTokenStr = jwt.sign(
      { sub: user.userId },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    )

    // C. BỔ SUNG: Lưu Access Token lên RAM Redis Docker với thời gian tự hủy (TTL) 3600 giây
    const redisKey = `accessToken:${user.userId}:${accessToken}`;
    await redisClient.set(redisKey, 'valid', {
      EX: 3600
    });

    // D. BỔ SUNG: Lưu cấu trúc Refresh Token xuống đĩa cứng PostgreSQL
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7);
    await prisma.refreshToken.create({
      data: {
        userId: user.userId,
        token: refreshTokenStr,
        expiryDate: expiryDate
      }
    });


    return { 
      accessToken: accessToken,
      refreshToken: refreshTokenStr, 
      tokenType: 'Bearer' };
  }

  // BỔ SUNG : NGHIỆP VỤ CẤP ĐỔI ACCESS TOKEN MỚI KHI TOKEN CŨ HẾT HẠN (Refresh Token Process)
  async refresh(oldRefreshToken) {
    if (!oldRefreshToken) throw new Error('Refresh Token is required');

    let decoded;
    try {
      decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      throw new Error('Invalid or expired refresh token. Please re-login.');
    }

    // Đối chiếu bản ghi cấu trúc dữ liệu an toàn dưới PostgreSQL
    const dbToken = await prisma.refreshToken.findUnique({
      where: { token: oldRefreshToken },
      include: { user: { include: { role: true } } }
    });

    if (!dbToken || dbToken.isRevoked || new Date() > dbToken.expiryDate) {
      throw new Error('Refresh token is invalid, revoked, or expired.');
    }

    // Đúc một chiếc Access Token mới tinh (Gia hạn tiếp 60 phút)
    const newAccessToken = jwt.sign(
      { sub: dbToken.user.userId, email: dbToken.user.email, role: dbToken.user.role.code },
      process.env.JWT_SECRET,
      { expiresIn: '60m' }
    );

    // Tiếp tục đồng bộ và lưu chiếc Access Token mới này vào Redis Docker gối đầu
    const redisKey = `accessToken:${dbToken.user.userId}:${newAccessToken}`;
    await redisClient.set(redisKey, 'valid', { EX: 3600 });

    return { accessToken: newAccessToken, tokenType: 'Bearer' };
  }

  // BỔ SUNG 4: NGHIỆP VỤ ĐĂNG XUẤT (Xóa sạch dấu vết Token khỏi Redis và PostgreSQL lập tức)
  async logout(userId, accessToken, refreshTokenStr) {
    // Hành động 1: Trục xuất, xóa hẳn Access Token khỏi RAM Redis
    const redisKey = `accessToken:${userId}:${accessToken}`;
    await redisClient.del(redisKey);

    // Hành động 2: Xóa thực thể Refresh Token tương ứng dưới PostgreSQL
    if (refreshTokenStr) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshTokenStr }
      });
    }
    return true;
  }

  // 3. YÊU CẦU QUÊN MẬT KHẨU (Forgot Password & OTP Generation)
  async forgotPassword(email) {
    const user = await prisma.  user.findUnique({ where: { email } });
    if (!user) return true; // Tránh quét dò tìm email tồn tại bảo mật hệ thống

    // Sinh mã ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryDate = new Date();
    expiryDate.setMinutes(expiryDate.getMinutes() + 10); // Hiệu lực trong vòng 10 phút

    // Thực hiện lưu đè hoặc tạo mới OTP đính kèm thời điểm tạo createdAt
    await prisma.passwordResetOtp.upsert({
      where: { userId: user.userId },
      update: { code: otpCode, expiryDate, isUsed: false, createdAt: new Date() },
      create: { userId: user.userId, code: otpCode, expiryDate, isUsed: false, createdAt: new Date() }
    });

    // 2. THỰC HIỆN GỬI MAIL THẬT: Định dạng HTML có giao diện hiển thị chuyên nghiệp
    const mailOptions = {
      from: `"Horse Racing Support" <${process.env.EMAIL_USER}>`, // Tên hiển thị đại diện hệ thống
      to: email, // Email của người dùng bấm quên mật khẩu
      subject: '🔒 Security Verification: Your Password Reset OTP Code', // Tiêu đề thư
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
          <h2 style="color: #2c3e50; text-align: center;">Horse Racing Prediction System</h2>
          <hr style="border: 0; border-top: 1px solid #eeeeee;" />
          <p>Dear Customer,</p>
          <p>We received a request to reset the password for your account. Please use the verification code below to proceed with your password change. This code is valid for <strong>10 minutes</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #e74c3c; background-color: #f9f9f9; padding: 10px 25px; border-radius: 4px; border: 1px dashed #cccccc;">
              ${otpCode}
            </span>
          </div>
          <p style="color: #7f8c8d; font-size: 13px;">If you did not request this password reset, please ignore this email or contact our system admin immediately to secure your account.</p>
          <hr style="border: 0; border-top: 1px solid #eeeeee; margin-top: 30px;" />
          <p style="font-size: 12px; color: #bdc3c7; text-align: center;">This is an automated system email. Please do not reply directly to this message.</p>
        </div>
      `
    };

    try {
      const info = await mailerTransporter.sendMail(mailOptions);
      console.log(`[MAILER SUCCESS] Mail sent perfectly! MessageID: ${info.messageId}`);
    } catch (mailError) {
      console.error('❌ [MAILER ERROR] Google SMTP rejected:', mailError.message);
      throw new Error(`Failed to send email: ${mailError.message}`);
    }

    return true;
  }

  // 4. KHÔI PHỤC MẬT KHẨU QUA MÃ OTP (Reset Password Execution)
  async resetPassword(data) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { resetOtp: true }
    });

    if (!user || !user.resetOtp) throw new Error('Invalid email or password reset request');

    const otp = user.resetOtp;

    if (otp.code !== data.otpCode) throw new Error('Invalid OTP code');
    if (otp.isUsed) throw new Error('This OTP code has already been used');
    if (new Date() > otp.expiryDate) throw new Error('OTP code has expired (10 minutes validity)');

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    // Cập nhật đồng thời mật khẩu mới và vô hiệu hóa mã OTP
    await prisma.$transaction([
      prisma.user.update({
        where: { userId: user.userId },
        data: { passwordHash: hashedPassword }
      }),
      prisma.passwordResetOtp.update({
        where: { userId: user.userId },
        data: { isUsed: true }
      })
    ]);

    return true;
  }

  // 5. NGHIỆP VỤ CẬP NHẬT HỒ SƠ NGƯỜI DÙNG & TỰ ĐỘNG DUYỆT HỒ SƠ JOCKEY
  async updateProfile(userId, roleCode, data) {
    // 1. Tìm thông tin người dùng hiện tại trong cơ sở dữ liệu
    const currentUser = await prisma.user.findUnique({ where: { userId } });
    if (!currentUser) throw new Error('User account not found');

    const updateData = {};

    // 2. Xử lý nghiệp vụ thay đổi mật khẩu an toàn
    if (data.newPassword) {
      const isMatch = await bcrypt.compare(data.oldPassword, currentUser.passwordHash);
      if (!isMatch) throw new Error('Incorrect old password. Verification failed.');
      
      updateData.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }

    // 3. Cập nhật các trường thông tin cơ bản dùng chung
    if (data.fullName !== undefined) updateData.fullName = data.fullName;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;

    // 4. Xử lý dữ liệu đặc thù dành riêng cho Jockey
    if (roleCode === 'JOCKEY') {
      if (data.licenseNumber !== undefined) updateData.licenseNumber = data.licenseNumber;
      if (data.weight !== undefined) updateData.weight = data.weight;
      if (data.bio !== undefined) updateData.bio = data.bio;

      // Hợp nhất dữ liệu mới và cũ để kiểm tra tính toàn vẹn của hồ sơ Jockey
      const finalLicense = data.licenseNumber !== undefined ? data.licenseNumber : currentUser.licenseNumber;
      const finalWeight = data.weight !== undefined ? data.weight : currentUser.weight;

      // Hồ sơ Jockey chỉ được coi là hoàn thành (true) khi điền ĐỦ cả số chứng chỉ hành nghề và cân nặng
      updateData.isProfileComplete = !!finalLicense && !!finalWeight;
    }

    // 5. Thực thi cập nhật xuống PostgreSQL
    const updatedUser = await prisma.user.update({
      where: { userId },
      data: updateData
    });

    const { passwordHash, ...userResponse } = updatedUser;
    return userResponse;
  }

  async getMyProfile(userId) {
    const user = await prisma.user.findUnique({
      where: { userId },
      include: {
        role: true,
        pointWallet: true,
      }
    });

    if (!user) throw new Error('User account does not exist in system');

    const { passwordHash, ...safeUserResponse } = user;
    return safeUserResponse;
  }
}

module.exports = new AuthService();