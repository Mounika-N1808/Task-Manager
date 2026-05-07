const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb, run, get, assignUserToSampleProjects } = require('../config/database');
const authenticate = require('../middleware/auth');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nebula-taskmanager-secret-2024';
const COLORS = ['#6366f1','#8b5cf6','#06b6d4','#10b981','#f59e0b','#ef4444','#ec4899'];

router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
  await getDb();
  if (get('SELECT id FROM users WHERE email=?', [email.toLowerCase()])) return res.status(409).json({ error: 'Email already registered' });
  const count = get('SELECT COUNT(*) as c FROM users', []).c;
  const role  = count === 0 ? 'admin' : 'member';
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const hash  = bcrypt.hashSync(password, 10);
  try {
    const row  = run('INSERT INTO users (name,email,password_hash,role,avatar_color) VALUES (?,?,?,?,?)', [name, email.toLowerCase(), hash, role, color]);
    assignUserToSampleProjects(row.lastInsertRowid);
    const user = get('SELECT id,name,email,role,avatar_color FROM users WHERE id=?', [row.lastInsertRowid]);
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user });
  } catch(e) { res.status(500).json({ error: 'Failed to create account' }); }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  await getDb();
  const user = get('SELECT * FROM users WHERE email=?', [email.toLowerCase()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid email or password' });
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  const { password_hash, ...safe } = user;
  res.json({ token, user: safe });
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

module.exports = router;
