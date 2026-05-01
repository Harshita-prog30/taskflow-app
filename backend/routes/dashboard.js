const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const today = new Date().toISOString().split('T')[0];
  let stats = {};

  if (req.user.role === 'admin') {
    stats.totalProjects = db.prepare('SELECT COUNT(*) as c FROM projects').get().c;
    stats.totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    stats.totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks').get().c;
    stats.tasksByStatus = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all();
    stats.tasksByPriority = db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all();
    stats.overdueTasks = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.due_date < ? AND t.status != 'done'
      ORDER BY t.due_date ASC LIMIT 10
    `).all(today);
    stats.recentTasks = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      ORDER BY t.updated_at DESC LIMIT 8
    `).all();
    stats.projectStats = db.prepare(`
      SELECT p.id, p.name, p.status,
        COUNT(t.id) as total_tasks,
        SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done_tasks
      FROM projects p
      LEFT JOIN tasks t ON t.project_id = p.id
      GROUP BY p.id ORDER BY p.created_at DESC LIMIT 5
    `).all();
  } else {
    stats.myProjects = db.prepare('SELECT COUNT(DISTINCT project_id) as c FROM project_members WHERE user_id = ?').get(req.user.id).c;
    stats.myTasks = db.prepare('SELECT COUNT(*) as c FROM tasks WHERE assignee_id = ?').get(req.user.id).c;
    stats.tasksByStatus = db.prepare('SELECT status, COUNT(*) as count FROM tasks WHERE assignee_id = ? GROUP BY status').all(req.user.id);
    stats.overdueTasks = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assignee_id = ? AND t.due_date < ? AND t.status != 'done'
      ORDER BY t.due_date ASC LIMIT 5
    `).all(req.user.id, today);
    stats.recentTasks = db.prepare(`
      SELECT t.*, u.name as assignee_name, p.name as project_name
      FROM tasks t
      LEFT JOIN users u ON t.assignee_id = u.id
      LEFT JOIN projects p ON t.project_id = p.id
      WHERE t.assignee_id = ? OR t.creator_id = ?
      ORDER BY t.updated_at DESC LIMIT 8
    `).all(req.user.id, req.user.id);
  }

  res.json(stats);
});

module.exports = router;