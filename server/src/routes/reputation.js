const express = require('express');
const db = require('../db/init');
const { requireAuth } = require('../middleware/auth');
const { notify } = require('../utils/notify');
const { computeTrustBreakdown, getFullProfileTrust } = require('../utils/trustEngine');

const router = express.Router();

// ---------- Endorsements ----------
router.post('/endorsements', requireAuth, (req, res) => {
  const { targetUsername, skillId, evidence } = req.body;
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(targetUsername);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.user.id) return res.status(400).json({ error: "You can't endorse yourself." });
  const skill = db.prepare('SELECT * FROM skills WHERE id = ?').get(skillId);
  if (!skill) return res.status(404).json({ error: 'Skill not found.' });
  db.prepare('INSERT INTO endorsements (endorser_id, target_id, skill_id, evidence) VALUES (?, ?, ?, ?)')
    .run(req.user.id, target.id, skillId, evidence || '');
  notify(target.id, 'endorsement', `@${req.user.username} endorsed you for ${skill.name}.`, `/u/${target.username}`);
  res.status(201).json({ ok: true });
});

router.get('/endorsements/:username', (req, res) => {
  const target = db.prepare('SELECT * FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  const rows = db.prepare(`
    SELECT e.*, u.username, u.display_name, u.avatar_seed, s.name as skill_name
    FROM endorsements e JOIN users u ON e.endorser_id = u.id JOIN skills s ON e.skill_id = s.id
    WHERE e.target_id = ? ORDER BY e.created_at DESC
  `).all(target.id);
  res.json({ endorsements: rows.map(r => ({ evidence: r.evidence, skillName: r.skill_name, createdAt: r.created_at, endorser: { username: r.username, displayName: r.display_name, avatarSeed: r.avatar_seed } })) });
});

// ---------- Verification requests ----------
router.post('/verification-requests', requireAuth, (req, res) => {
  const { reviewerUsername, skillId, message } = req.body;
  const reviewer = db.prepare('SELECT * FROM users WHERE username = ?').get(reviewerUsername);
  if (!reviewer) return res.status(404).json({ error: 'Reviewer not found.' });
  if (reviewer.id === req.user.id) return res.status(400).json({ error: "You can't request self-verification." });
  db.prepare('INSERT INTO verification_requests (requester_id, reviewer_id, skill_id, message) VALUES (?, ?, ?, ?)')
    .run(req.user.id, reviewer.id, skillId, message || '');
  notify(reviewer.id, 'verify_request', `@${req.user.username} asked you to verify a skill.`, `/notifications`);
  res.status(201).json({ ok: true });
});

router.get('/verification-requests/incoming', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT vr.*, u.username, u.display_name, s.name as skill_name FROM verification_requests vr
    JOIN users u ON vr.requester_id = u.id JOIN skills s ON vr.skill_id = s.id
    WHERE vr.reviewer_id = ? AND vr.status = 'pending' ORDER BY vr.created_at DESC
  `).all(req.user.id);
  res.json({ requests: rows });
});

router.post('/verification-requests/:id/resolve', requireAuth, (req, res) => {
  const { approve } = req.body;
  const reqRow = db.prepare('SELECT * FROM verification_requests WHERE id = ?').get(req.params.id);
  if (!reqRow) return res.status(404).json({ error: 'Request not found.' });
  if (reqRow.reviewer_id !== req.user.id) return res.status(403).json({ error: 'Only the requested reviewer can resolve this.' });
  const status = approve ? 'approved' : 'declined';
  db.prepare(`UPDATE verification_requests SET status = ?, resolved_at = datetime('now') WHERE id = ?`).run(status, reqRow.id);
  if (approve) notify(reqRow.requester_id, 'verified', `Your skill was peer-verified by @${req.user.username}.`, `/u/${req.user.username}`);
  res.json({ ok: true });
});

// ---------- Notifications ----------
router.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ notifications: rows });
});

router.post('/notifications/read', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.user.id);
  res.json({ ok: true });
});

// ---------- Trust breakdown (transparency) ----------
router.get('/trust/:username', (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const { skill } = req.query;
  let skillId = null;
  if (skill) {
    const s = db.prepare('SELECT id FROM skills WHERE name = ?').get(skill);
    skillId = s ? s.id : null;
  }
  const result = computeTrustBreakdown(user.id, skillId);
  res.json(result);
});

// ---------- Reports ----------
router.post('/reports', requireAuth, (req, res) => {
  const { targetType, targetId, reason } = req.body;
  if (!targetType || !targetId || !reason) return res.status(400).json({ error: 'Please specify what you are reporting and why.' });
  db.prepare('INSERT INTO reports (reporter_id, target_type, target_id, reason) VALUES (?, ?, ?, ?)').run(req.user.id, targetType, targetId, reason);
  res.status(201).json({ ok: true });
});

// ---------- Skill verification challenges ----------
const CHALLENGE_BANK = {
  'Python': [
    { q: 'What does the `yield` keyword create?', options: ['A generator', 'A decorator', 'A thread', 'A lambda'], answer: 0 },
    { q: 'Which is mutable in Python?', options: ['tuple', 'str', 'list', 'frozenset'], answer: 2 },
    { q: 'What does GIL stand for?', options: ['Global Import Lock', 'Global Interpreter Lock', 'General Iterator Loop', 'Grouped Instance List'], answer: 1 },
    { q: 'Which method is called on object creation?', options: ['__init__', '__new__', '__create__', '__start__'], answer: 0 },
    { q: 'List comprehensions are best used for:', options: ['I/O bound tasks', 'Concise transformations of iterables', 'Threading', 'Memory leaks'], answer: 1 },
  ],
  'Artificial Intelligence': [
    { q: 'What is overfitting?', options: ['Model too simple', 'Model memorizes training noise', 'Model underperforms on train set', 'A regularization technique'], answer: 1 },
    { q: 'Backpropagation computes:', options: ['Gradients via chain rule', 'Random weights', 'Data augmentation', 'Feature scaling'], answer: 0 },
    { q: 'What does "attention" mechanism primarily do?', options: ['Compresses images', 'Weighs relevance across inputs', 'Normalizes gradients', 'Removes outliers'], answer: 1 },
    { q: 'A confusion matrix is used to evaluate:', options: ['Regression only', 'Classification performance', 'Clustering quality', 'Learning rate'], answer: 1 },
    { q: 'Which is an unsupervised technique?', options: ['Linear regression', 'K-means clustering', 'Logistic regression', 'Random forest classification'], answer: 1 },
  ],
  'Backend Engineering': [
    { q: 'What does idempotent mean for an HTTP method?', options: ['Always fails', 'Repeated calls have the same effect as one', 'Requires auth', 'Cannot be cached'], answer: 1 },
    { q: 'Which HTTP status means "Created"?', options: ['200', '201', '301', '404'], answer: 1 },
    { q: 'What problem do database indexes solve?', options: ['Slow writes', 'Slow reads/lookups', 'Data loss', 'Schema migration'], answer: 1 },
    { q: 'What is a race condition?', options: ['Fast query execution', 'Unsynchronized concurrent access causing bugs', 'A caching strategy', 'A load balancer type'], answer: 1 },
    { q: 'JWTs are typically used for:', options: ['Encrypting databases', 'Stateless authentication', 'Load balancing', 'Image compression'], answer: 1 },
  ],
};
const DEFAULT_BANK = [
  { q: 'What best demonstrates real expertise?', options: ['Follower count', 'Verifiable evidence of work', 'Number of posts', 'Account age alone'], answer: 1 },
  { q: 'Peer verification is most useful when it is:', options: ['Anonymous and unweighted', 'From people with their own demonstrated trust', 'Automatic for everyone', 'Based on likes only'], answer: 1 },
  { q: 'Consistency in reputation systems rewards:', options: ['One-time bursts of activity', 'Sustained, regular contribution', 'Inactivity', 'Follower growth'], answer: 1 },
];

router.get('/challenges/:skillName', (req, res) => {
  const bank = CHALLENGE_BANK[req.params.skillName] || DEFAULT_BANK;
  const questions = bank.map((q, i) => ({ id: i, q: q.q, options: q.options }));
  res.json({ questions });
});

router.post('/challenges/:skillName/submit', requireAuth, (req, res) => {
  const { answers } = req.body; // { "0": 1, "1": 0, ... }
  const bank = CHALLENGE_BANK[req.params.skillName] || DEFAULT_BANK;
  let correct = 0;
  bank.forEach((q, i) => { if (answers && Number(answers[i]) === q.answer) correct++; });
  const score = Math.round((correct / bank.length) * 100);
  const passed = score >= 60 ? 1 : 0;
  const skill = db.prepare('SELECT id FROM skills WHERE name = ?').get(req.params.skillName);
  if (skill) {
    db.prepare('INSERT INTO challenge_attempts (user_id, skill_id, score, passed) VALUES (?, ?, ?, ?)').run(req.user.id, skill.id, score, passed);
    if (passed) {
      db.prepare(`INSERT INTO user_skills (user_id, skill_id, self_rating) VALUES (?, ?, ?)
                  ON CONFLICT(user_id, skill_id) DO UPDATE SET self_rating = MAX(self_rating, excluded.self_rating)`)
        .run(req.user.id, skill.id, 60);
    }
  }
  res.json({ score, passed: !!passed, correct, total: bank.length });
});

module.exports = router;
