const express = require('express');
const { getDb, run, get, all } = require('../config/database');
const authenticate = require('../middleware/auth');
const requireRole  = require('../middleware/roleGuard');
const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  await getDb();
  const projects = all(`
    SELECT p.*, u.name as owner_name, u.avatar_color as owner_color
    FROM projects p JOIN users u ON p.owner_id=u.id
    JOIN project_members pm ON pm.project_id=p.id WHERE pm.user_id=?
    ORDER BY p.created_at DESC`, [req.user.id]);
  projects.forEach(p => {
    const counts = get('SELECT COUNT(*) as tc, SUM(CASE WHEN status="done" THEN 1 ELSE 0 END) as dc FROM tasks WHERE project_id=?',[p.id]);
    p.task_count = counts.tc||0; p.done_count = counts.dc||0;
    p.member_count = (get('SELECT COUNT(*) as c FROM project_members WHERE project_id=?',[p.id])||{}).c||0;
  });
  res.json({ projects });
});

router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, description, status } = req.body;
  if (!name) return res.status(400).json({ error: 'Project name required' });
  await getDb();
  const row = run('INSERT INTO projects (name,description,status,owner_id) VALUES (?,?,?,?)',[name,description||'',status||'active',req.user.id]);
  run('INSERT OR IGNORE INTO project_members (project_id,user_id) VALUES (?,?)',[row.lastInsertRowid,req.user.id]);
  res.status(201).json({ project: get('SELECT * FROM projects WHERE id=?',[row.lastInsertRowid]) });
});

router.get('/:id', authenticate, async (req, res) => {
  await getDb();
  const project = get('SELECT p.*,u.name as owner_name FROM projects p JOIN users u ON p.owner_id=u.id WHERE p.id=?',[req.params.id]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (!get('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?',[project.id,req.user.id]) && req.user.role!=='admin')
    return res.status(403).json({ error: 'Access denied' });
  const members = all('SELECT u.id,u.name,u.email,u.role,u.avatar_color,pm.joined_at FROM users u JOIN project_members pm ON pm.user_id=u.id WHERE pm.project_id=?',[project.id]);
  res.json({ project, members });
});

router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await getDb();
  const p = get('SELECT * FROM projects WHERE id=?',[req.params.id]);
  if (!p) return res.status(404).json({ error: 'Project not found' });
  const { name, description, status } = req.body;
  run('UPDATE projects SET name=?,description=?,status=? WHERE id=?',[name||p.name,description??p.description,status||p.status,p.id]);
  res.json({ project: get('SELECT * FROM projects WHERE id=?',[p.id]) });
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await getDb();
  if (!get('SELECT id FROM projects WHERE id=?',[req.params.id])) return res.status(404).json({ error: 'Project not found' });
  run('DELETE FROM tasks WHERE project_id=?',[req.params.id]);
  run('DELETE FROM project_members WHERE project_id=?',[req.params.id]);
  run('DELETE FROM projects WHERE id=?',[req.params.id]);
  res.json({ message: 'Project deleted' });
});

router.post('/:id/members', authenticate, requireRole('admin'), async (req, res) => {
  const { userId } = req.body;
  await getDb();
  if (!get('SELECT id FROM projects WHERE id=?',[req.params.id])) return res.status(404).json({ error: 'Project not found' });
  const user = get('SELECT id,name,email,role,avatar_color FROM users WHERE id=?',[userId]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (get('SELECT 1 FROM project_members WHERE project_id=? AND user_id=?',[req.params.id,userId])) return res.status(409).json({ error: 'Already a member' });
  run('INSERT INTO project_members (project_id,user_id) VALUES (?,?)',[req.params.id,userId]);
  res.json({ message: 'Member added', user });
});

router.delete('/:id/members/:userId', authenticate, requireRole('admin'), async (req, res) => {
  await getDb();
  run('DELETE FROM project_members WHERE project_id=? AND user_id=?',[req.params.id,req.params.userId]);
  res.json({ message: 'Member removed' });
});

module.exports = router;
