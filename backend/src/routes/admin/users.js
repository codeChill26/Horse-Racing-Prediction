// backend/src/routes/admin/users.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminUsersController = require('../../controllers/adminUsers.controller');

// GET /api/admin/users?roleCode=ADMIN
router.get('/', authMiddleware, adminOnly, adminUsersController.listUsers);

// GET /api/admin/users/:id
router.get('/:id', authMiddleware, adminOnly, adminUsersController.getUserById);

// POST /api/admin/users
router.post('/', authMiddleware, adminOnly, adminUsersController.createUser);

// PATCH /api/admin/users/:id
router.patch('/:id', authMiddleware, adminOnly, adminUsersController.updateUser);

// PATCH /api/admin/users/:id/toggle-active
router.patch('/:id/toggle-active', authMiddleware, adminOnly, adminUsersController.toggleIsActive);

// DELETE /api/admin/users/:id
// Soft-delete by deactivating the user and revoking sessions.
router.delete('/:id', authMiddleware, adminOnly, adminUsersController.deactivateUser);

// PATCH /api/admin/users/:id/role
// body: { roleId?: number, roleCode?: string, confirm: true }
router.patch('/:id/role', authMiddleware, adminOnly, adminUsersController.changeRole);

module.exports = router;
