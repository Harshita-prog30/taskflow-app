const express = require('express');
const router = express.Router();
const { getDB } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.get('/', authenticate, (req, res) => {
  const db = getDB();
  const users = db.prepare('SELECT id, name, email, role, created_at FROM users ORDER BY name ASC').all();
  res.json(users);
});

router.get('/:id', authenticate, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.put('/:id/role', authenticate, requireAdmin, (req, res) => {
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  const db = getDB();
  db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, req.params.id);
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(req.params.id);
  res.json(user);
});

router.delete('/:id', authenticate, requireAdmin, (req, res) => {
  const db = getDB();
  if (parseInt(req.params.id) === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ message: 'User deleted' });
});

module.exports = router;