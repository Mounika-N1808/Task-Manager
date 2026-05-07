module.exports = function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Access denied', message: `Requires ${roles.join(' or ')} role` });
    next();
  };
};
