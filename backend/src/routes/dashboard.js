const express = require('express');
const { getDb, all, assignUserToSampleProjects } = require('../config/database');
const authenticate = require('../middleware/auth');
const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  await getDb();
  const today = new Date().toISOString().split('T')[0];
  let pids = all('SELECT project_id FROM project_members WHERE user_id=?',[req.user.id]).map(r=>r.project_id);
  if (!pids.length) {
    assignUserToSampleProjects(req.user.id);
    pids = all('SELECT project_id FROM project_members WHERE user_id=?',[req.user.id]).map(r=>r.project_id);
  }
  if (!pids.length) return res.json({ total:0,todo:0,in_progress:0,review:0,done:0,overdue:0,projects:0,myTasks:0,recentTasks:[],projectStats:[] });

  const ph = pids.map(()=>'?').join(',');
  const t  = all(`SELECT * FROM tasks WHERE project_id IN (${ph})`, pids);
  const total       = t.length;
  const todo        = t.filter(x=>x.status==='todo').length;
  const in_progress = t.filter(x=>x.status==='in_progress').length;
  const review      = t.filter(x=>x.status==='review').length;
  const done        = t.filter(x=>x.status==='done').length;
  const overdue     = t.filter(x=>x.status!=='done' && x.due_date && x.due_date < today).length;
  const myTasks     = t.filter(x=>x.assignee_id==req.user.id).length;

  const recentTasks = all(`
    SELECT t.id,t.title,t.status,t.priority,t.due_date,p.name as project_name,u.name as assignee_name,u.avatar_color as assignee_color
    FROM tasks t LEFT JOIN projects p ON t.project_id=p.id LEFT JOIN users u ON t.assignee_id=u.id
    WHERE t.project_id IN (${ph}) ORDER BY t.created_at DESC LIMIT 8`, pids);

  const projectStats = all(`
    SELECT p.id,p.name,p.status FROM projects p
    JOIN project_members pm ON pm.project_id=p.id WHERE pm.user_id=?
    ORDER BY p.created_at DESC`,[req.user.id]).map(p => {
      const tc = all('SELECT status FROM tasks WHERE project_id=?',[p.id]);
      return { ...p, task_count: tc.length, done_count: tc.filter(x=>x.status==='done').length };
    });

  res.json({ total, todo, in_progress, review, done, overdue, myTasks, projects:pids.length, recentTasks, projectStats });
});

module.exports = router;
