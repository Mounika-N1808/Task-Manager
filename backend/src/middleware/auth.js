const jwt = require('jsonwebtoken');
const { getDb, get } = require('../config/database');
const JWT_SECRET = process.env.JWT_SECRET || 'nebula-taskmanager-secret-2024';

module.exports = async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    await getDb();
    const user = get('SELECT id,name,email,role,avatar_color FROM users WHERE id=?', [decoded.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
