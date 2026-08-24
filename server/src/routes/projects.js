const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { touchActive, notify } = require('../utils/notify');

const router = express.Router();

function shapeProject(row) {
  return {
    id: row.id, title: row.title, description: row.description, url: row.url,
    skillName: row.skill_name, verifiedCount: row.verified_count, createdAt: row.created_at,
    author: row.username ? { username: row.username, displayName: row.display_name, avatarSeed: row.avatar_seed } : undefined,
  };
}

router.get('/', (req, res) => {
  const { username } = req.query;
  let sql = `SELECT p.*, u.username, u.display_name, u.avatar_seed, s.name as skill_name
             FROM projects p JOIN users u ON p.user_id = u.id LEFT JOIN skills s ON p.skill_id = s.id`;
  const params = [];
  if (username) { sql += ' WHERE u.username = ?'; params.push(username); }
  sql += ' ORDER BY p.created_at DESC';
  const rows = db.prepare(sql).all(...params);
  res.json({ projects: rows.map(shapeProject) });
});

router.post('/', requireAuth, (req, res) => {
  const { title, description, skillId, url } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'A project needs a title.' });
  if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Please provide a valid evidence URL (repo, demo, or write-up) starting with http(s)://.' });
  const info = db.prepare('INSERT INTO projects (user_id, title, description, skill_id, url) VALUES (?, ?, ?, ?, ?)')
    .run(req.user.id, title.trim(), description || '', skillId || null, url.trim());
  touchActive(req.user.id);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/:id/verify', requireAuth, (req, res) => {
  const { comment } = req.body;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found.' });
  if (project.user_id === req.user.id) return res.status(400).json({ error: "You can't verify your own project." });
  const existing = db.prepare('SELECT 1 FROM project_verifications WHERE project_id = ? AND user_id = ?').get(project.id, req.user.id);
  if (existing) return res.status(409).json({ error: 'You already verified this project.' });
  db.prepare('INSERT INTO project_verifications (project_id, user_id, comment) VALUES (?, ?, ?)').run(project.id, req.user.id, comment || '');
  db.prepare('UPDATE projects SET verified_count = verified_count + 1 WHERE id = ?').run(project.id);
  notify(project.user_id, 'verify', `@${req.user.username} verified your project "${project.title}".`, `/u/${req.user.username}`);
  res.json({ ok: true });
});

router.get('/:id/verifications', (req, res) => {
  const rows = db.prepare(`
    SELECT v.*, u.username, u.display_name, u.avatar_seed FROM project_verifications v
    JOIN users u ON v.user_id = u.id WHERE v.project_id = ? ORDER BY v.created_at DESC
  `).all(req.params.id);
  res.json({ verifications: rows.map(r => ({ comment: r.comment, createdAt: r.created_at, author: { username: r.username, displayName: r.display_name, avatarSeed: r.avatar_seed } })) });
});

module.exports = router;
