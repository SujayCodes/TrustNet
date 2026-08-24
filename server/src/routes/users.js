const express = require('express');
const db = require('../db/init');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { getFullProfileTrust } = require('../utils/trustEngine');
const { computeBadges } = require('../utils/badges');
const { notify } = require('../utils/notify');

const router = express.Router();

router.get('/skills/all', (req, res) => {
  const skills = db.prepare('SELECT id, name FROM skills ORDER BY name').all();
  res.json({ skills });
});

router.get('/leaderboard', (req, res) => {
  const { skill } = req.query;
  const users = db.prepare("SELECT id, username, display_name, headline, avatar_seed FROM users WHERE username NOT LIKE 'follower%'").all();
  let rows = users.map(u => {
    const trust = getFullProfileTrust(u.id);
    let score = trust.overall.score;
    let scopedLabel = 'Overall';
    if (skill) {
      const match = trust.perSkill.find(s => s.skillName.toLowerCase() === String(skill).toLowerCase());
      score = match ? match.score : 0;
      scopedLabel = skill;
    }
    const followers = db.prepare('SELECT COUNT(*) c FROM follows WHERE following_id = ?').get(u.id).c;
    return { ...u, score, followers, scopedLabel };
  });
  rows.sort((a, b) => b.score - a.score);
  res.json({ leaderboard: rows.slice(0, 100) });
});

router.get('/search', (req, res) => {
  const { q, minScore } = req.query;
  let users = db.prepare("SELECT id, username, display_name, headline, avatar_seed FROM users WHERE username NOT LIKE 'follower%'").all();
  if (q) {
    const needle = String(q).toLowerCase();
    users = users.filter(u => u.username.toLowerCase().includes(needle) || u.display_name.toLowerCase().includes(needle) || (u.headline || '').toLowerCase().includes(needle));
  }
  let rows = users.map(u => {
    const trust = getFullProfileTrust(u.id);
    return { ...u, score: trust.overall.score };
  });
  if (minScore) rows = rows.filter(r => r.score >= Number(minScore));
  rows.sort((a, b) => b.score - a.score);
  res.json({ results: rows.slice(0, 50) });
});

router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, display_name, headline, bio, avatar_seed, created_at FROM users WHERE username = ?').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  const trust = getFullProfileTrust(user.id);
  const badges = computeBadges(user.id);
  const skills = db.prepare(`
    SELECT s.id, s.name, us.self_rating FROM user_skills us JOIN skills s ON us.skill_id = s.id WHERE us.user_id = ?
  `).all(user.id);
  const followers = db.prepare('SELECT COUNT(*) c FROM follows WHERE following_id = ?').get(user.id).c;
  const following = db.prepare('SELECT COUNT(*) c FROM follows WHERE follower_id = ?').get(user.id).c;
  const scoreHistory = db.prepare('SELECT score, recorded_at FROM trust_score_history WHERE user_id = ? ORDER BY recorded_at ASC').all(user.id);

  let isFollowing = false;
  if (req.user) {
    isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id);
  }

  res.json({
    user,
    skills,
    trust,
    badges,
    followers,
    following,
    isFollowing,
    isSelf: req.user ? req.user.id === user.id : false,
    scoreHistory,
  });
});

router.put('/me/profile', requireAuth, (req, res) => {
  const { displayName, headline, bio } = req.body;
  db.prepare('UPDATE users SET display_name = COALESCE(?, display_name), headline = COALESCE(?, headline), bio = COALESCE(?, bio) WHERE id = ?')
    .run(displayName, headline, bio, req.user.id);
  const user = db.prepare('SELECT id, username, display_name, headline, bio FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

router.post('/me/skills', requireAuth, (req, res) => {
  const { skillId, selfRating } = req.body;
  const skill = db.prepare('SELECT id FROM skills WHERE id = ?').get(skillId);
  if (!skill) return res.status(404).json({ error: 'Skill not found.' });
  db.prepare(`INSERT INTO user_skills (user_id, skill_id, self_rating) VALUES (?, ?, ?)
              ON CONFLICT(user_id, skill_id) DO UPDATE SET self_rating = excluded.self_rating`)
    .run(req.user.id, skillId, selfRating || 50);
  res.json({ ok: true });
});

router.post('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  if (target.id === req.user.id) return res.status(400).json({ error: "You can't follow yourself." });
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, target.id);
  notify(target.id, 'follow', `@${req.user.username} started following you.`, `/u/${req.user.username}`);
  res.json({ ok: true });
});

router.delete('/:username/follow', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE username = ?').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found.' });
  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
  res.json({ ok: true });
});

module.exports = router;
