const express = require('express');
const { getDb, run, get, all } = require('../config/database');
const authenticate = require('../middleware/auth');
const router = express.Router();

const taskSel = `SELECT t.*, u1.name as assignee_name, u1.avatar_color as assignee_color, u2.name as creator_name, p.name as project_name
  FROM tasks t LEFT JOIN users u1 ON t.assignee_id=u1.id LEFT JOIN users u2 ON t.created_by=u2.id LEFT JOIN projects p ON t.project_id=p.id`;

router.get('/', authenticate, async (req, res) => {
  await getDb();
  const { projectId } = req.query;
  let tasks;
  if (projectId) {
    tasks = all(taskSel + ' WHERE t.project_id=? ORDER BY t.created_at DESC', [projectId]);
  } else {
    const pids = all('SELECT project_id FROM project_members WHERE user_id=?',[req.user.id]).map(r=>r.project_id);
    tasks = pids.length ? all(taskSel + ` WHERE t.project_id IN (${pids.map(()=>'?').join(',')}) ORDER BY t.created_at DESC`, pids) : [];
  }
  res.json({ tasks });
});

router.get('/my', authenticate, async (req, res) => {
  await getDb();
  const tasks = all(taskSel + ' WHERE t.assignee_id=? ORDER BY t.created_at DESC', [req.user.id]);
  res.json({ tasks });
});

router.post('/', authenticate, async (req, res) => {
  const { title, description, status, priority, project_id, assignee_id, due_date } = req.body;
  if (!title || !project_id) return res.status(400).json({ error: 'Title and project_id required' });
  await getDb();
  const row = run('INSERT INTO tasks (title,description,status,priority,project_id,assignee_id,created_by,due_date) VALUES (?,?,?,?,?,?,?,?)',
    [title, description||'', status||'todo', priority||'medium', project_id, assignee_id||null, req.user.id, due_date||null]);
  const task = get(taskSel + ' WHERE t.id=?', [row.lastInsertRowid]);
  res.status(201).json({ task });
});

router.put('/:id', authenticate, async (req, res) => {
  await getDb();
  const t = get('SELECT * FROM tasks WHERE id=?',[req.params.id]);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  const { title, description, status, priority, assignee_id, due_date } = req.body;
  run('UPDATE tasks SET title=?,description=?,status=?,priority=?,assignee_id=?,due_date=? WHERE id=?',
    [title||t.title, description??t.description, status||t.status, priority||t.priority,
     assignee_id !== undefined ? (assignee_id||null) : t.assignee_id,
     due_date !== undefined ? (due_date||null) : t.due_date, t.id]);
  const task = get(taskSel + ' WHERE t.id=?', [t.id]);
  res.json({ task });
});

router.delete('/:id', authenticate, async (req, res) => {
  await getDb();
  const t = get('SELECT * FROM tasks WHERE id=?',[req.params.id]);
  if (!t) return res.status(404).json({ error: 'Task not found' });
  if (t.created_by !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Access denied' });
  run('DELETE FROM tasks WHERE id=?',[t.id]);
  res.json({ message: 'Task deleted' });
});

module.exports = router;
