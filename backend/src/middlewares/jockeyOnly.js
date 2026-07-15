// backend/src/middlewares/jockeyOnly.js

module.exports = (req, res, next) => {
  const roleCode = req.user?.role;
  if (roleCode !== 'JOCKEY') {
    return res.status(403).json({ error: 'Forbidden: jockey access required.' });
  }

  return next();
};
