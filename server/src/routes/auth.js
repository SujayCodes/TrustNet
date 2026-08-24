const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/init');
const { sign } = require('../middleware/auth');

const router = express.Router();

router.post('/register', (req, res) => {
  const { username, email, password, displayName, headline } = req.body;
  if (!username || !email || !password || !displayName) {
    return res.status(400).json({ error: 'Username, email, password, and display name are all required.' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Usernames must be 3-20 characters: letters, numbers, underscores only.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  }
  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) return res.status(409).json({ error: 'That username or email is already taken.' });

  const hash = bcrypt.hashSync(password, 10);
  const info = db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, headline, avatar_seed)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(username, email, hash, displayName, headline || '', username);

  const user = db.prepare('SELECT id, username, display_name, headline FROM users WHERE id = ?').get(info.lastInsertRowid);
  const token = sign(user);
  res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: 'Enter your username/email and password.' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(identifier, identifier);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Incorrect username/email or password.' });
  }
  db.prepare(`UPDATE users SET last_active_at = datetime('now') WHERE id = ?`).run(user.id);
  const token = sign(user);
  res.json({ token, user: { id: user.id, username: user.username, display_name: user.display_name, headline: user.headline } });
});

module.exports = router;
