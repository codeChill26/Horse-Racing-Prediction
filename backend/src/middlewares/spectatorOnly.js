module.exports = (req, res, next) => {
  const roleCode = req.user?.role;
  if (roleCode !== 'SPECTATOR') {
    return res.status(403).json({ error: 'Forbidden: spectator access required.' });
  }
  return next();
};
