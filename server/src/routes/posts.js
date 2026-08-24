const express = require('express');
const db = require('../db/init');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { touchActive, notify } = require('../utils/notify');

const router = express.Router();

function shapePost(row, viewerId) {
  const likes = db.prepare('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?').get(row.id).c;
  const commentCount = db.prepare('SELECT COUNT(*) c FROM post_comments WHERE post_id = ?').get(row.id).c;
  const liked = viewerId ? !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(row.id, viewerId) : false;
  return {
    id: row.id,
    content: row.content,
    evidenceUrl: row.evidence_url,
    createdAt: row.created_at,
    skillName: row.skill_name,
    author: { username: row.username, displayName: row.display_name, avatarSeed: row.avatar_seed },
    likes, commentCount, liked,
  };
}

router.get('/', optionalAuth, (req, res) => {
  const { skill, author } = req.query;
  let sql = `SELECT p.*, u.username, u.display_name, u.avatar_seed, s.name as skill_name
             FROM posts p JOIN users u ON p.user_id = u.id LEFT JOIN skills s ON p.skill_id = s.id`;
  const clauses = []; const params = [];
  if (skill) { clauses.push('s.name = ?'); params.push(skill); }
  if (author) { clauses.push('u.username = ?'); params.push(author); }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY p.created_at DESC LIMIT 100';
  const rows = db.prepare(sql).all(...params);
  res.json({ posts: rows.map(r => shapePost(r, req.user?.id)) });
});

router.post('/', requireAuth, (req, res) => {
  const { content, skillId, evidenceUrl } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Post content cannot be empty.' });
  const info = db.prepare('INSERT INTO posts (user_id, content, skill_id, evidence_url) VALUES (?, ?, ?, ?)')
    .run(req.user.id, content.trim(), skillId || null, evidenceUrl || '');
  touchActive(req.user.id);
  const row = db.prepare(`SELECT p.*, u.username, u.display_name, u.avatar_seed, s.name as skill_name
                           FROM posts p JOIN users u ON p.user_id = u.id LEFT JOIN skills s ON p.skill_id = s.id
                           WHERE p.id = ?`).get(info.lastInsertRowid);
  res.status(201).json({ post: shapePost(row, req.user.id) });
});

router.post('/:id/like', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(post.id, req.user.id);
  if (existing) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(post.id, req.user.id);
  } else {
    db.prepare('INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)').run(post.id, req.user.id);
    if (post.user_id !== req.user.id) notify(post.user_id, 'like', `@${req.user.username} liked your post.`, `/feed`);
  }
  const likes = db.prepare('SELECT COUNT(*) c FROM post_likes WHERE post_id = ?').get(post.id).c;
  res.json({ likes, liked: !existing });
});

router.get('/:id/comments', (req, res) => {
  const rows = db.prepare(`
    SELECT c.*, u.username, u.display_name, u.avatar_seed FROM post_comments c
    JOIN users u ON c.user_id = u.id WHERE c.post_id = ? ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json({ comments: rows.map(r => ({ id: r.id, content: r.content, createdAt: r.created_at, author: { username: r.username, displayName: r.display_name, avatarSeed: r.avatar_seed } })) });
});

router.post('/:id/comments', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Comment cannot be empty.' });
  const post = db.prepare('SELECT * FROM posts WHERE id = ?').get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Post not found.' });
  db.prepare('INSERT INTO post_comments (post_id, user_id, content) VALUES (?, ?, ?)').run(post.id, req.user.id, content.trim());
  touchActive(req.user.id);
  if (post.user_id !== req.user.id) notify(post.user_id, 'comment', `@${req.user.username} commented on your post.`, `/feed`);
  res.status(201).json({ ok: true });
});

module.exports = router;
