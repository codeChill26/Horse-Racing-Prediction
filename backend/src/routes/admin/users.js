// backend/src/routes/admin/users.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminUsersController = require('../../controllers/adminUsers.controller');

/**
 * API Lấy danh sách tài khoản Trọng tài chuyên biệt (Mục MEDIUM-19)
 * GET /api/admin/referees
 */
router.get('/referees', authMiddleware, adminOnly, async (req, res) => {
  try {
    const prisma = require('../../config/prisma');
    
    // Tìm kiếm tất cả user có liên kết với Role Trọng tài
    const referees = await prisma.user.findMany({
      where: {
        role: {
          code: { in: ['Referee', 'RACE_REFEREE', 'REFEREE'] } // Chấp nhận các biến thể định danh hệ thống
        },
        isActive: true
      },
      select: {
        userId: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        licenseNumber: true
      },
      orderBy: { fullName: 'asc' }
    });

    return res.status(200).json({ referees });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

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
