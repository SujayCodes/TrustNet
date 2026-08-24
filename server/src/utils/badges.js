const db = require('../db/init');
const { getFullProfileTrust } = require('./trustEngine');

const BADGE_DEFS = [
  { id: 'first_evidence', label: 'First Evidence', desc: 'Submitted your first project or answer with proof.', check: (s, ctx) => ctx.totalEvidence >= 1 },
  { id: 'rising_verifier', label: 'Rising Verifier', desc: 'Reached an overall Trust Score of 50+.', check: (s) => s.overall.score >= 50 },
  { id: 'domain_expert', label: 'Domain Expert', desc: 'Hit 85+ Trust Score in any single skill.', check: (s) => s.perSkill.some(sk => sk.score >= 85) },
  { id: 'consistent_contributor', label: 'Consistent Contributor', desc: 'Maintained activity with no inactivity decay.', check: (s, ctx) => ctx.idleDays <= 14 && s.overall.score >= 40 },
  { id: 'community_pillar', label: 'Community Pillar', desc: 'Received endorsements from 5+ different peers.', check: (s, ctx) => ctx.uniqueEndorsers >= 5 },
  { id: 'verified_builder', label: 'Verified Builder', desc: 'A project was independently verified by 3+ peers.', check: (s, ctx) => ctx.maxProjectVerifications >= 3 },
  { id: 'trusted_authority', label: 'Trusted Authority', desc: 'Reached an overall Trust Score of 90+.', check: (s) => s.overall.score >= 90 },
];

function computeBadges(userId) {
  const trust = getFullProfileTrust(userId);
  const totalEvidence = db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM projects WHERE user_id = ?) +
      (SELECT COUNT(*) FROM answers WHERE user_id = ? AND evidence_url != '') as c
  `).get(userId, userId).c;
  const uniqueEndorsers = db.prepare(`SELECT COUNT(DISTINCT endorser_id) c FROM endorsements WHERE target_id = ?`).get(userId).c;
  const maxProjectVerifications = db.prepare(`SELECT COALESCE(MAX(verified_count),0) m FROM projects WHERE user_id = ?`).get(userId).m;
  const idleRow = db.prepare(`SELECT julianday('now') - julianday(last_active_at) d FROM users WHERE id = ?`).get(userId);
  const ctx = { totalEvidence, uniqueEndorsers, maxProjectVerifications, idleDays: idleRow ? idleRow.d : 999 };

  return BADGE_DEFS
    .filter(b => b.check(trust, ctx))
    .map(b => ({ id: b.id, label: b.label, description: b.desc }));
}

module.exports = { computeBadges, BADGE_DEFS };
