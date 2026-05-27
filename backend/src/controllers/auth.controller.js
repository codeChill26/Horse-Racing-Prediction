// backend/src/controllers/auth.controller.js

const authService = require('../services/auth');
const validator = require('../dto/auth.dto');

async function register(req, res) {
  try {
    const validatedBody = validator.validateRegister(req.body);
    const result = await authService.register(validatedBody);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refresh(refreshToken);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(401).json({ error: error.message });
  }
}

async function logout(req, res) {
  try {
    const userId = req.user.sub;
    const accessToken = req.token;
    const { refreshToken } = req.body;

    await authService.logout(userId, accessToken, refreshToken);
    return res
      .status(200)
      .json({ message: 'Logged out successfully, session cleared from Redis and DB.' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    await authService.forgotPassword(email);
    return res.status(200).json({
      message: 'If an account with this email exists, an OTP code has been sent.',
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function resetPassword(req, res) {
  try {
    const validatedBody = validator.validateResetPassword(req.body);
    await authService.resetPassword(validatedBody);
    return res.status(200).json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function updateProfile(req, res) {
  try {
    const userId = req.user.sub;
    const roleCode = req.user.role;

    const validatedBody = validator.validateUpdateProfile(req.body);

    const result = await authService.updateProfile(userId, roleCode, validatedBody);
    return res.status(200).json({
      message: 'Profile updated successfully',
      user: result,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function getMyProfile(req, res) {
  try {
    const userId = req.user.sub;

    const result = await authService.getMyProfile(userId);
    return res.status(200).json({
      message: 'Fetch profile data successfully',
      user: result,
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

module.exports = {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  updateProfile,
  getMyProfile,
};
