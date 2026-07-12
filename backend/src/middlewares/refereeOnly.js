// backend/src/middlewares/refereeOnly.js

module.exports = (req, res, next) => {
  const roleCode = req.user?.role;
  if (roleCode !== 'RACE_REFEREE') {
    return res.status(403).json({ error: 'Forbidden: referee access required.' });
  }

  return next();
};