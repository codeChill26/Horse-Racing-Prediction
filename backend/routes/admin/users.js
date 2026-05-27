// backend/routes/admin/users.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../../src/middlewares/auth');
const adminOnly = require('../../src/middlewares/adminOnly');
const adminUsersService = require('../../src/services/adminUsers');
const validator = require('../../src/dto/adminUser.dto');

// GET /api/admin/users?roleCode=ADMIN
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { roleCode } = validator.validateListUsers(req.query);
    const users = await adminUsersService.listUsers({ roleCode });
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

// GET /api/admin/users/:id
router.get('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await adminUsersService.getUserById(userId);
    return res.status(200).json({ user });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
});

// POST /api/admin/users
router.post('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const validatedBody = validator.validateCreateUser(req.body);
    const user = await adminUsersService.createUser(validatedBody);
    return res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
});

// PATCH /api/admin/users/:id
router.patch('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const validatedBody = validator.validateUpdateUser(req.body);
    const user = await adminUsersService.updateUser(userId, validatedBody);
    return res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
});

// PATCH /api/admin/users/:id/toggle-active
router.patch('/:id/toggle-active', authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await adminUsersService.toggleIsActive(userId);
    return res.status(200).json({
      message: `User isActive toggled to ${user.isActive}`,
      user,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
});

// DELETE /api/admin/users/:id
// Soft-delete by deactivating the user and revoking sessions.
router.delete('/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const user = await adminUsersService.deactivateUser(userId);
    return res.status(200).json({ message: 'User deactivated successfully', user });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
});

// PATCH /api/admin/users/:id/role
// body: { roleId?: number, roleCode?: string, confirm: true }
router.patch('/:id/role', authMiddleware, adminOnly, async (req, res) => {
  try {
    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({ error: 'Invalid user id' });
    }

    const { roleId, roleCode } = validator.validateChangeRole(req.body);
    const user = await adminUsersService.changeRole(userId, { roleId, roleCode });

    return res.status(200).json({
      message: 'User role updated successfully',
      user,
    });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
});

module.exports = router;
