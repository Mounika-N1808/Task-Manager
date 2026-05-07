const express = require('express');
const { getDb, run, get, all } = require('../config/database');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roleGuard');
const router = express.Router();

router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  await getDb();
  res.json({ users: all('SELECT id,name,email,role,avatar_color,created_at FROM users ORDER BY created_at DESC',[]) });
});

router.put('/:id/role', authenticate, requireRole('admin'), async (req, res) => {
  const { role } = req.body;
  if (!['admin','member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  await getDb();
  if (!get('SELECT id FROM users WHERE id=?',[req.params.id])) return res.status(404).json({ error: 'User not found' });
  run('UPDATE users SET role=? WHERE id=?',[role,req.params.id]);
  res.json({ message: 'Role updated' });
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await getDb();
  run('DELETE FROM users WHERE id=?',[req.params.id]);
  res.json({ message: 'User deleted' });
});

module.exports = router;
