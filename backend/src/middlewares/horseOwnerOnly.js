module.exports = (req, res, next) => {
  const roleCode = req.user?.role;
  if (roleCode !== 'HORSE_OWNER') {
    return res.status(403).json({ error: 'Forbidden: horse owner access required.' });
  }

  return next();
};
