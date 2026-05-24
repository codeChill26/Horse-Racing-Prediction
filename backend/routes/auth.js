// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const authService = require('../src/services/auth'); 
const validator = require('../src/dto/auth.dto');  
const authMiddleware = require('../src/middlewares/auth'); 

// 1. API ĐĂNG KÝ: POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Kích hoạt DTO validation kiểm tra email chuẩn, mật khẩu >= 8 ký tự
    const validatedBody = validator.validateRegister(req.body);
    const result = await authService.register(validatedBody);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// 2. API ĐĂNG NHẬP: POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    // Hàm này sẽ generate Access Token ném vào Redis và Refresh Token ném vào DB
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
});

// 3. API LÀM MỚI ACCESS TOKEN: POST /api/auth/refresh
// API này để public vì lúc này Access Token cũ của người dùng đã chết (hết hạn 60 phút)
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    return res.status(200).json(result);
  } catch (error) {
    // Trả về 401 Unauthorized ép Frontend phải đá người dùng ra màn login nếu Refresh Token cũng hỏng
    return res.status(401).json({ error: error.message });
  }
});

// 4. API ĐĂNG XUẤT: POST /api/auth/logout
// API này bắt buộc phải đi qua authMiddleware để xác thực xem ai đang muốn đăng xuất
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;       // Lấy ra từ payload token đã giải mã ở Middleware
    const accessToken = req.token;     // Lấy ra chuỗi token vật lý đang dùng
    const { refreshToken } = req.body; // Lấy từ body lên để xóa nốt dưới PostgreSQL
    
    await authService.logout(userId, accessToken, refreshToken);
    return res.status(200).json({ message: 'Logged out successfully, session cleared from Redis and DB.' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// 5. API YÊU CẦU QUÊN MẬT KHẨU: POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return res.status(200).json({ message: 'If an account with this email exists, an OTP code has been sent.' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// 6. API ĐẶT LẠI MẬT KHẨU MỚI QUA OTP: POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const validatedBody = validator.validateResetPassword(req.body);
    await authService.resetPassword(validatedBody);
    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// 7. API CẬP NHẬT HỒ SƠ: PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub;       // Trích xuất từ token đã giải mã ở Middleware
    const roleCode = req.user.role;    // Trích xuất vai trò hệ thống hiện tại ('SPECTATOR', 'JOCKEY',...)
    
    // Kích hoạt tầng DTO validate dữ liệu đầu vào
    const validatedBody = validator.validateUpdateProfile(req.body);
    
    const result = await authService.updateProfile(userId, roleCode, validatedBody);
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: result
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// 8. API LẤY THÔNG TIN PROFILE: GET /api/auth/profile
// Bảo vệ nghiêm ngặt qua authMiddleware
router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.sub; 
    
    const result = await authService.getMyProfile(userId);
    return res.status(200).json({
      message: 'Fetch profile data successfully',
      user: result
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

module.exports = router;