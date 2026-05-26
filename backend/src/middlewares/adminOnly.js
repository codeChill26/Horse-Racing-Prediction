// backend/src/middlewares/adminOnly.js

module.exports = (req, res, next) => {
  const roleCode = req.user?.role;
  if (roleCode !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden: admin access required.' });
  }

  return next();
};
