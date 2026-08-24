const db = require('../db/init');

function notify(userId, type, message, link = '') {
  db.prepare(`INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)`)
    .run(userId, type, message, link);
}

function touchActive(userId) {
  db.prepare(`UPDATE users SET last_active_at = datetime('now') WHERE id = ?`).run(userId);
}

module.exports = { notify, touchActive };
