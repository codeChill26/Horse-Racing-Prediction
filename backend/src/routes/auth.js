// backend/src/routes/auth.js
const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth');

// 1. API ĐĂNG KÝ: POST /api/auth/register
router.post('/register', authController.register);

// 2. API ĐĂNG NHẬP: POST /api/auth/login
router.post('/login', authController.login);

// 3. API LÀM MỚI ACCESS TOKEN: POST /api/auth/refresh
router.post('/refresh', authController.refresh);

// 4. API ĐĂNG XUẤT: POST /api/auth/logout
router.post('/logout', authMiddleware, authController.logout);

// 5. API YÊU CẦU QUÊN MẬT KHẨU: POST /api/auth/forgot-password
router.post('/forgot-password', authController.forgotPassword);

// 6. API ĐẶT LẠI MẬT KHẨU MỚI QUA OTP: POST /api/auth/reset-password
router.post('/reset-password', authController.resetPassword);

// 7. API CẬP NHẬT HỒ SƠ: PUT /api/auth/profile
router.put('/profile', authMiddleware, authController.updateProfile);

// 8. API LẤY THÔNG TIN PROFILE: GET /api/auth/profile
router.get('/profile', authMiddleware, authController.getMyProfile);

module.exports = router;
