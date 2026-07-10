// backend/src/controllers/adminUsers.controller.js

const adminUsersService = require('../services/adminUsers');
const validator = require('../dto/adminUser.dto');

async function listUsers(req, res) {
  try {
    const { roleCode } = validator.validateListUsers(req.query);
    const users = await adminUsersService.listUsers({ roleCode });
    return res.status(200).json({ users });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function getUserById(req, res) {
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
}

async function createUser(req, res) {
  try {
    const validatedBody = validator.validateCreateUser(req.body);
    const user = await adminUsersService.createUser(validatedBody);
    return res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    const status = error.status || 400;
    return res.status(status).json({ error: error.message });
  }
}

async function updateUser(req, res) {
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
}

async function toggleIsActive(req, res) {
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
}

async function changeRole(req, res) {
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
}

async function deactivateUser(req, res) {
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
}

async function getMyViolations(req, res) {
  try {
    const userId = Number(req.user.sub);
    const result = await adminUsersService.getMyViolations(userId);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
}

async function getViolationsList(req, res) {
  try {
    const { status, severity } = req.query;
    const result = await adminUsersService.getViolationsList({ status, severity });
    return res.status(200).json(result);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function reportViolation(req, res) {
  try {
    const result = await adminUsersService.reportViolation(req.body);
    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
}

async function resolveViolation(req, res) {
  try {
    const { id } = req.params;
    const { penalty, note } = req.body;
    const result = await adminUsersService.resolveViolation(id, penalty, note);
    return res.status(200).json(result);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message });
  }
}

module.exports = {
  listUsers,
  getUserById,
  createUser,
  updateUser,
  toggleIsActive,
  changeRole,
  deactivateUser,
  getMyViolations,
  getViolationsList,
  reportViolation,
  resolveViolation,
};
