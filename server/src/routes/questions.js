const express = require('express');
const db = require('../db/init');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { touchActive, notify } = require('../utils/notify');

const router = express.Router();

function shapeQuestion(row) {
  const answerCount = db.prepare('SELECT COUNT(*) c FROM answers WHERE question_id = ?').get(row.id).c;
  const hasAccepted = !!db.prepare('SELECT 1 FROM answers WHERE question_id = ? AND is_accepted = 1').get(row.id);
  return {
    id: row.id, title: row.title, body: row.body, createdAt: row.created_at,
    skillName: row.skill_name,
    author: { username: row.username, displayName: row.display_name, avatarSeed: row.avatar_seed },
    answerCount, hasAccepted,
  };
}

router.get('/', (req, res) => {
  const { skill } = req.query;
  let sql = `SELECT q.*, u.username, u.display_name, u.avatar_seed, s.name as skill_name
             FROM questions q JOIN users u ON q.user_id = u.id LEFT JOIN skills s ON q.skill_id = s.id`;
  const params = [];
  if (skill) { sql += ' WHERE s.name = ?'; params.push(skill); }
  sql += ' ORDER BY q.created_at DESC LIMIT 100';
  const rows = db.prepare(sql).all(...params);
  res.json({ questions: rows.map(shapeQuestion) });
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`SELECT q.*, u.username, u.display_name, u.avatar_seed, s.name as skill_name
                           FROM questions q JOIN users u ON q.user_id = u.id LEFT JOIN skills s ON q.skill_id = s.id
                           WHERE q.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Question not found.' });
  const answers = db.prepare(`
    SELECT a.*, u.username, u.display_name, u.avatar_seed,
      (SELECT COALESCE(SUM(value),0) FROM answer_votes WHERE answer_id = a.id) as votes
    FROM answers a JOIN users u ON a.user_id = u.id WHERE a.question_id = ?
    ORDER BY is_accepted DESC, votes DESC, a.created_at ASC
  `).all(req.params.id);
  res.json({
    question: shapeQuestion(row),
    answers: answers.map(a => ({
      id: a.id, body: a.body, evidenceUrl: a.evidence_url, isAccepted: !!a.is_accepted,
      votes: a.votes, createdAt: a.created_at,
      author: { username: a.username, displayName: a.display_name, avatarSeed: a.avatar_seed },
    })),
  });
});

router.post('/', requireAuth, (req, res) => {
  const { title, body, skillId } = req.body;
  if (!title || !body) return res.status(400).json({ error: 'A question needs both a title and details.' });
  const info = db.prepare('INSERT INTO questions (user_id, title, body, skill_id) VALUES (?, ?, ?, ?)')
    .run(req.user.id, title.trim(), body.trim(), skillId || null);
  touchActive(req.user.id);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/:id/answers', requireAuth, (req, res) => {
  const { body, evidenceUrl } = req.body;
  if (!body || !body.trim()) return res.status(400).json({ error: 'Your answer cannot be empty.' });
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!question) return res.status(404).json({ error: 'Question not found.' });
  const info = db.prepare('INSERT INTO answers (question_id, user_id, body, evidence_url) VALUES (?, ?, ?, ?)')
    .run(question.id, req.user.id, body.trim(), evidenceUrl || '');
  touchActive(req.user.id);
  if (question.user_id !== req.user.id) notify(question.user_id, 'answer', `@${req.user.username} answered your question.`, `/questions/${question.id}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

router.post('/answers/:id/vote', requireAuth, (req, res) => {
  const { value } = req.body; // 1 or -1
  const v = value === -1 ? -1 : 1;
  const answer = db.prepare('SELECT * FROM answers WHERE id = ?').get(req.params.id);
  if (!answer) return res.status(404).json({ error: 'Answer not found.' });
  db.prepare(`INSERT INTO answer_votes (answer_id, user_id, value) VALUES (?, ?, ?)
              ON CONFLICT(answer_id, user_id) DO UPDATE SET value = excluded.value`)
    .run(answer.id, req.user.id, v);
  const votes = db.prepare('SELECT COALESCE(SUM(value),0) c FROM answer_votes WHERE answer_id = ?').get(answer.id).c;
  res.json({ votes });
});

router.post('/answers/:id/accept', requireAuth, (req, res) => {
  const answer = db.prepare('SELECT * FROM answers WHERE id = ?').get(req.params.id);
  if (!answer) return res.status(404).json({ error: 'Answer not found.' });
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(answer.question_id);
  if (question.user_id !== req.user.id) return res.status(403).json({ error: 'Only the question author can accept an answer.' });
  db.prepare('UPDATE answers SET is_accepted = 0 WHERE question_id = ?').run(question.id);
  db.prepare('UPDATE answers SET is_accepted = 1 WHERE id = ?').run(answer.id);
  notify(answer.user_id, 'accepted', `Your answer was accepted on "${question.title}".`, `/questions/${question.id}`);
  res.json({ ok: true });
});

module.exports = router;
