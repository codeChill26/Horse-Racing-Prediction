// backend/src/routes/admin/users.js

const express = require('express');
const router = express.Router();

const authMiddleware = require('../../middlewares/auth');
const adminOnly = require('../../middlewares/adminOnly');
const adminUsersController = require('../../controllers/adminUsers.controller');
const prisma = require('../../config/prisma');
const { REFEREE_ROLE_VARIANTS } = require('../../utils/roleCodeVariants');

/**
 * API Lấy danh sách tài khoản Trọng tài chuyên biệt (Mục MEDIUM-19)
 * GET /api/admin/referees
 */
router.get('/referees', authMiddleware, adminOnly, async (req, res) => {
  try {
    // Tìm kiếm tất cả user có liên kết với Role Trọng tài
    // Hỗ trợ nhiều biến thể role code (vd 'RACE_REFEREE', 'Referee', 'REFEREE')
    // để tương thích với dữ liệu seed cũ. Xem utils/roleCodeVariants.js.
    const referees = await prisma.user.findMany({
      where: {
        role: {
          code: { in: [...REFEREE_ROLE_VARIANTS] },
        },
        isActive: true,
      },
      select: {
        userId: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        licenseNumber: true,
        isActive: true,
        role: { select: { roleId: true, code: true, name: true } },
      },
      orderBy: { fullName: 'asc' },
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
