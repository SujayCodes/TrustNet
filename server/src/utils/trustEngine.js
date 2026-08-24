const db = require('../db/init');

/**
 * TrustNet Reputation Engine
 * ---------------------------------
 * Trust is computed, not claimed. Every component below is derived from
 * verifiable activity in the database - never from a self-reported number.
 *
 * WEIGHTS (sum to 100):
 *   Accepted answers        20
 *   Helpful answers (votes) 15
 *   Peer endorsements       20   (weighted recursively by endorser's own trust)
 *   Project evidence        15   (boosted by independent peer verification)
 *   Consistency             10   (activity regularity, decays when inactive)
 *   Post quality             8   (engagement per post, not raw volume)
 *   Peer verification        7   (formal review requests approved by high-trust reviewers)
 *   Account history           5   (age & clean standing)
 */
const WEIGHTS = {
  acceptedAnswers: 20,
  helpfulAnswers: 15,
  endorsements: 20,
  projects: 15,
  consistency: 10,
  postQuality: 8,
  peerVerification: 7,
  accountHistory: 5,
};

function clamp(n, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function logistic(x, k = 1, mid = 0) { return 100 / (1 + Math.exp(-k * (x - mid))); }

// Base trust of a user with no history yet (everyone starts equal, at zero rank power)
const BASE_RANK = 40;

function getUserBaseline(userId) {
  // Non-recursive, cheap approximation of a user's own trust for weighting
  // endorsements/verifications they give to others (prevents infinite recursion).
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM answers WHERE user_id = ? AND is_accepted = 1) as accepted,
      (SELECT COUNT(*) FROM projects WHERE user_id = ?) as projects,
      (SELECT COUNT(*) FROM endorsements WHERE target_id = ?) as endorsed,
      (SELECT julianday('now') - julianday(created_at) FROM users WHERE id = ?) as age_days
  `).get(userId, userId, userId, userId);
  if (!row) return BASE_RANK;
  const score = BASE_RANK
    + Math.min(row.accepted * 3, 24)
    + Math.min(row.projects * 2, 16)
    + Math.min(row.endorsed * 1.5, 15)
    + Math.min((row.age_days || 0) / 10, 5);
  return clamp(score);
}

function computeAcceptedAnswers(userId, skillId) {
  const q = skillId
    ? db.prepare(`SELECT COUNT(*) c FROM answers a JOIN questions q ON a.question_id = q.id
                  WHERE a.user_id = ? AND a.is_accepted = 1 AND q.skill_id = ?`).get(userId, skillId)
    : db.prepare(`SELECT COUNT(*) c FROM answers WHERE user_id = ? AND is_accepted = 1`).get(userId);
  return { value: clamp(logistic(q.c, 0.9, 1.5)), raw: q.c };
}

function computeHelpfulAnswers(userId, skillId) {
  const q = skillId
    ? db.prepare(`SELECT COALESCE(SUM(v.value),0) s FROM answer_votes v
                  JOIN answers a ON v.answer_id = a.id JOIN questions qq ON a.question_id = qq.id
                  WHERE a.user_id = ? AND qq.skill_id = ?`).get(userId, skillId)
    : db.prepare(`SELECT COALESCE(SUM(v.value),0) s FROM answer_votes v
                  JOIN answers a ON v.answer_id = a.id WHERE a.user_id = ?`).get(userId);
  return { value: clamp(logistic(q.s, 0.5, 3)), raw: q.s };
}

function computeEndorsements(userId, skillId) {
  const rows = skillId
    ? db.prepare(`SELECT endorser_id, evidence FROM endorsements WHERE target_id = ? AND skill_id = ? ORDER BY created_at ASC`).all(userId, skillId)
    : db.prepare(`SELECT endorser_id, evidence FROM endorsements WHERE target_id = ? ORDER BY created_at ASC`).all(userId);

  // Anti-gaming: diminishing returns for repeat endorsements from the same person,
  // and endorsement weight is scaled by the endorser's own baseline trust
  // (a recursive, PageRank-style signal: endorsements from trusted people count more).
  const seenFrom = new Map();
  let weightedSum = 0;
  for (const r of rows) {
    const count = seenFrom.get(r.endorser_id) || 0;
    const diminish = Math.pow(0.4, count); // 1, 0.4, 0.16, ...
    const endorserTrust = getUserBaseline(r.endorser_id) / 100; // 0..1
    const evidenceBoost = r.evidence && r.evidence.trim().length > 20 ? 1.25 : 1.0;
    weightedSum += diminish * endorserTrust * evidenceBoost * 16;
    seenFrom.set(r.endorser_id, count + 1);
  }
  return { value: clamp(weightedSum), raw: rows.length };
}

function computeProjects(userId, skillId) {
  const rows = skillId
    ? db.prepare(`SELECT verified_count FROM projects WHERE user_id = ? AND skill_id = ?`).all(userId, skillId)
    : db.prepare(`SELECT verified_count FROM projects WHERE user_id = ?`).all(userId);
  let sum = 0;
  for (const p of rows) sum += 20 + Math.min(p.verified_count * 10, 40);
  return { value: clamp(logistic(sum, 0.06, 25)), raw: rows.length };
}

function computeConsistency(userId) {
  // Rewards regular activity across posts/answers/projects over the last 90 days,
  // and decays trust for long inactivity - reputation must be maintained, not just earned once.
  const row = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM posts WHERE user_id = ? AND created_at >= datetime('now','-90 day')) +
      (SELECT COUNT(*) FROM answers WHERE user_id = ? AND created_at >= datetime('now','-90 day')) +
      (SELECT COUNT(*) FROM projects WHERE user_id = ? AND created_at >= datetime('now','-90 day')) as activity90,
      (SELECT julianday('now') - julianday(last_active_at) FROM users WHERE id = ?) as idle_days
  `).get(userId, userId, userId, userId);
  let value = logistic(row.activity90 || 0, 0.7, 2);
  const idle = row.idle_days || 0;
  if (idle > 14) {
    const decay = Math.min(0.6, (idle - 14) / 60); // up to 60% decay
    value = value * (1 - decay);
  }
  return { value: clamp(value), raw: row.activity90, idleDays: Math.round(idle) };
}

function computePostQuality(userId, skillId) {
  const posts = skillId
    ? db.prepare(`SELECT p.id FROM posts p WHERE p.user_id = ? AND p.skill_id = ?`).all(userId, skillId)
    : db.prepare(`SELECT id FROM posts WHERE user_id = ?`).all(userId);
  if (posts.length === 0) return { value: 0, raw: 0 };
  let engagement = 0;
  for (const p of posts) {
    const likes = db.prepare(`SELECT COUNT(*) c FROM post_likes WHERE post_id = ?`).get(p.id).c;
    const comments = db.prepare(`SELECT COUNT(*) c FROM post_comments WHERE post_id = ?`).get(p.id).c;
    engagement += likes * 1 + comments * 2;
  }
  const perPost = engagement / posts.length;
  return { value: clamp(logistic(perPost, 0.6, 2)), raw: Math.round(engagement) };
}

function computePeerVerification(userId, skillId) {
  const rows = skillId
    ? db.prepare(`SELECT reviewer_id FROM verification_requests WHERE requester_id = ? AND skill_id = ? AND status='approved'`).all(userId, skillId)
    : db.prepare(`SELECT reviewer_id FROM verification_requests WHERE requester_id = ? AND status='approved'`).all(userId);
  let sum = 0;
  for (const r of rows) sum += 15 * (getUserBaseline(r.reviewer_id) / 100);
  return { value: clamp(sum), raw: rows.length };
}

function computeAccountHistory(userId) {
  const row = db.prepare(`SELECT julianday('now') - julianday(created_at) as age, flagged_count FROM users WHERE id = ?`).get(userId);
  const ageScore = clamp((row?.age || 0) / 1.8); // ~180 days to max out
  const penalty = (row?.flagged_count || 0) * 15;
  return { value: clamp(ageScore - penalty), raw: Math.round(row?.age || 0) };
}

/**
 * Compute the full trust score breakdown for a user, optionally scoped to one skill.
 * Returns each component's 0-100 sub-score, its weight, contribution to the
 * final score, and the raw evidence count behind it (for full transparency).
 */
function computeTrustBreakdown(userId, skillId = null) {
  const components = {
    acceptedAnswers: computeAcceptedAnswers(userId, skillId),
    helpfulAnswers: computeHelpfulAnswers(userId, skillId),
    endorsements: computeEndorsements(userId, skillId),
    projects: computeProjects(userId, skillId),
    consistency: computeConsistency(userId),
    postQuality: computePostQuality(userId, skillId),
    peerVerification: computePeerVerification(userId, skillId),
    accountHistory: computeAccountHistory(userId),
  };

  let total = 0;
  const breakdown = [];
  for (const key of Object.keys(WEIGHTS)) {
    const weight = WEIGHTS[key];
    const comp = components[key];
    const contribution = (comp.value * weight) / 100;
    total += contribution;
    breakdown.push({
      key,
      label: LABELS[key],
      subScore: Math.round(comp.value * 10) / 10,
      weight,
      contribution: Math.round(contribution * 10) / 10,
      evidenceCount: comp.raw,
      extra: comp.idleDays !== undefined ? { idleDays: comp.idleDays } : undefined,
    });
  }

  return {
    score: Math.round(total * 10) / 10,
    breakdown,
  };
}

const LABELS = {
  acceptedAnswers: 'Accepted Answers',
  helpfulAnswers: 'Helpful Answers',
  endorsements: 'Peer Endorsements',
  projects: 'Project Evidence',
  consistency: 'Consistency',
  postQuality: 'Post Quality',
  peerVerification: 'Peer Verification',
  accountHistory: 'Account History',
};

function getUserSkillIds(userId) {
  return db.prepare(`SELECT skill_id FROM user_skills WHERE user_id = ?`).all(userId).map(r => r.skill_id);
}

function recordScoreSnapshot(userId, score) {
  const last = db.prepare(`SELECT score FROM trust_score_history WHERE user_id = ? ORDER BY recorded_at DESC LIMIT 1`).get(userId);
  if (!last || Math.abs(last.score - score) >= 0.1) {
    db.prepare(`INSERT INTO trust_score_history (user_id, score) VALUES (?, ?)`).run(userId, score);
  }
}

function getFullProfileTrust(userId) {
  const overall = computeTrustBreakdown(userId, null);
  recordScoreSnapshot(userId, overall.score);
  const skillIds = getUserSkillIds(userId);
  const skills = db.prepare(`SELECT id, name FROM skills WHERE id IN (${skillIds.map(() => '?').join(',') || 'NULL'})`).all(...skillIds);
  const perSkill = skills.map(s => {
    const res = computeTrustBreakdown(userId, s.id);
    return { skillId: s.id, skillName: s.name, score: res.score, breakdown: res.breakdown };
  });
  return { overall, perSkill };
}

module.exports = {
  WEIGHTS,
  LABELS,
  computeTrustBreakdown,
  getFullProfileTrust,
  getUserBaseline,
};
