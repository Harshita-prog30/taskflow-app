const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

function canAccessProject(db, projectId, user) {
  if (user.role === 'admin') return true;
  const member = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, user.id);
  return !!member;
}

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const { project_id, assignee_id, status } = req.query;

  let query = `
    SELECT t.*, 
      u1.name as assignee_name, u1.email as assignee_email,
      u2.name as creator_name,
      p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE 1=1
  `;
  const params = [];

  if (req.user.role !== 'admin') {
    query += ` AND t.project_id IN (SELECT project_id FROM project_members WHERE user_id = ?)`;
    params.push(req.user.id);
  }

  if (project_id) { query += ' AND t.project_id = ?'; params.push(project_id); }
  if (assignee_id) { query += ' AND t.assignee_id = ?'; params.push(assignee_id); }
  if (status) { query += ' AND t.status = ?'; params.push(status); }

  query += ' ORDER BY t.created_at DESC';
  const tasks = db.prepare(query).all(...params);
  res.json(tasks);
});

router.post('/', authenticate, [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('project_id').notEmpty().withMessage('Project ID required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, project_id, assignee_id, status, priority, due_date } = req.body;
  const db = getDB();

  if (!canAccessProject(db, project_id, req.user)) {
    return res.status(403).json({ error: 'No access to this project' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, status, priority, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description || null, project_id, assignee_id || null, req.user.id, status || 'todo', priority || 'medium', due_date || null);

  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(task);
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const task = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessProject(db, task.project_id, req.user)) return res.status(403).json({ error: 'No access' });
  res.json(task);
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!canAccessProject(db, task.project_id, req.user)) return res.status(403).json({ error: 'No access' });

  const { title, description, assignee_id, status, priority, due_date } = req.body;

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(title || null, description || null, assignee_id !== undefined ? 1 : null, assignee_id || null, status || null, priority || null, due_date || null, req.params.id);

  const updated = db.prepare(`
    SELECT t.*, u1.name as assignee_name, u2.name as creator_name, p.name as project_name
    FROM tasks t
    LEFT JOIN users u1 ON t.assignee_id = u1.id
    LEFT JOIN users u2 ON t.creator_id = u2.id
    LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id);

  res.json(updated);
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.user.role !== 'admin' && task.creator_id !== req.user.id) {
    return res.status(403).json({ error: 'No permission' });
  }
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

module.exports = router;