const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { getDB } = require('../db');
const { authenticate } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) as member_count
      FROM projects p JOIN users u ON p.owner_id = u.id
      ORDER BY p.created_at DESC
    `).all();
  } else {
    projects = db.prepare(`
      SELECT p.*, u.name as owner_name, pm.role as my_role,
        (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM project_members pm2 WHERE pm2.project_id = p.id) as member_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
      ORDER BY p.created_at DESC
    `).all(req.user.id);
  }
  res.json(projects);
});

router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name required'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const db = getDB();

  const result = db.prepare('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)').run(name, description || null, req.user.id);
  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(result.lastInsertRowid, req.user.id, 'admin');

  const project = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const project = db.prepare(`SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?`).get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin') {
    const member = db.prepare('SELECT * FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!member) return res.status(403).json({ error: 'No access' });
  }

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.role as system_role, pm.role as project_role, pm.joined_at
    FROM project_members pm JOIN users u ON pm.user_id = u.id
    WHERE pm.project_id = ?
  `).all(req.params.id);

  res.json({ ...project, members });
});

router.put('/:id', authenticate, (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'No permission' });
  }

  const { name, description, status } = req.body;
  db.prepare('UPDATE projects SET name = COALESCE(?, name), description = COALESCE(?, description), status = COALESCE(?, status) WHERE id = ?')
    .run(name || null, description || null, status || null, req.params.id);

  const updated = db.prepare('SELECT p.*, u.name as owner_name FROM projects p JOIN users u ON p.owner_id = u.id WHERE p.id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', authenticate, (req, res) => {
  const db = getDB();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (req.user.role !== 'admin' && project.owner_id !== req.user.id) {
    return res.status(403).json({ error: 'No permission' });
  }
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.json({ message: 'Project deleted' });
});

router.post('/:id/members', authenticate, (req, res) => {
  const db = getDB();
  const { user_id, role } = req.body;
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(user_id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const existing = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(req.params.id, user_id);
  if (existing) return res.status(409).json({ error: 'User already a member' });

  db.prepare('INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(req.params.id, user_id, role || 'member');
  res.status(201).json({ message: 'Member added' });
});

router.delete('/:id/members/:userId', authenticate, (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(req.params.id, req.params.userId);
  res.json({ message: 'Member removed' });
});

module.exports = router;