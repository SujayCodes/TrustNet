/* Populates realistic demo data so the app is impressive out-of-the-box. */
const bcrypt = require('bcryptjs');
const db = require('./db/init');

async function main() {
  await db.ready();

  const hash = bcrypt.hashSync('password123', 10);

function getOrCreateUser(u) {
  let row = db.prepare('SELECT * FROM users WHERE username = ?').get(u.username);
  if (row) return row;
  const info = db.prepare(`INSERT INTO users (username, email, password_hash, display_name, headline, bio, avatar_seed, created_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?), datetime('now', ?))`)
    .run(u.username, `${u.username}@example.com`, hash, u.displayName, u.headline, u.bio || '', u.username, u.createdOffset || '-200 day', u.activeOffset || '-1 day');
  return db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
}

function skillId(name) { return db.prepare('SELECT id FROM skills WHERE name = ?').get(name).id; }

const people = [
  { username: 'sujay', displayName: 'Sujay Rao', headline: 'Software Developer · AI Enthusiast', bio: 'Building things and proving it with evidence, not claims.', createdOffset: '-300 day' },
  { username: 'ananya', displayName: 'Ananya Iyer', headline: 'ML Engineer', bio: 'Deep learning, computer vision, and a lot of debugging.', createdOffset: '-260 day' },
  { username: 'devraj', displayName: 'Devraj Singh', headline: 'Backend Engineer @ scale', bio: 'APIs, databases, and distributed systems.', createdOffset: '-220 day' },
  { username: 'meera', displayName: 'Meera Nair', headline: 'Full-Stack Developer', bio: 'React by day, Node by night.', createdOffset: '-180 day' },
  { username: 'kabir', displayName: 'Kabir Malhotra', headline: 'Security Researcher', bio: 'Breaking things responsibly.', createdOffset: '-150 day' },
  { username: 'zara', displayName: 'Zara Khan', headline: 'Product Designer', bio: 'Design systems and delightful UX.', createdOffset: '-90 day' },
  { username: 'rohan', displayName: 'Rohan Verma', headline: 'Follower-famous, evidence-light', bio: 'Big audience, building my real track record here.', createdOffset: '-30 day', activeOffset: '-25 day' },
  { username: 'ishita', displayName: 'Ishita Sharma', headline: 'Data Scientist', bio: 'Turning messy data into decisions.', createdOffset: '-140 day' },
];

const users = {};
people.forEach(p => { users[p.username] = getOrCreateUser(p); });

// Skills per user
const userSkillMap = {
  sujay: ['Python', 'Backend Engineering', 'Artificial Intelligence'],
  ananya: ['Artificial Intelligence', 'Machine Learning', 'Python'],
  devraj: ['Backend Engineering', 'Databases', 'Cloud Computing'],
  meera: ['Frontend Engineering', 'JavaScript', 'UI/UX Design'],
  kabir: ['Cybersecurity', 'DevOps'],
  zara: ['UI/UX Design', 'Product Management'],
  rohan: ['JavaScript', 'Frontend Engineering'],
  ishita: ['Data Science', 'Machine Learning', 'Python'],
};
for (const [username, skills] of Object.entries(userSkillMap)) {
  skills.forEach(s => {
    db.prepare(`INSERT OR IGNORE INTO user_skills (user_id, skill_id, self_rating) VALUES (?, ?, ?)`)
      .run(users[username].id, skillId(s), 70);
  });
}

// Questions & answers
function addQnA(askerUsername, title, body, skillName, answers) {
  const existing = db.prepare('SELECT id FROM questions WHERE title = ?').get(title);
  let qId;
  if (existing) qId = existing.id;
  else {
    const info = db.prepare("INSERT INTO questions (user_id, title, body, skill_id, created_at) VALUES (?, ?, ?, ?, datetime('now','-40 day'))")
      .run(users[askerUsername].id, title, body, skillId(skillName));
    qId = info.lastInsertRowid;
  }
  answers.forEach((a, idx) => {
    const already = db.prepare('SELECT id FROM answers WHERE question_id = ? AND user_id = ?').get(qId, users[a.username].id);
    if (already) return;
    const info = db.prepare(`INSERT INTO answers (question_id, user_id, body, evidence_url, is_accepted, created_at) VALUES (?, ?, ?, ?, ?, datetime('now', '-${39 - idx} day'))`)
      .run(qId, users[a.username].id, a.body, a.url || '', a.accepted ? 1 : 0);
    const answerId = info.lastInsertRowid;
    (a.votes || []).forEach(voterUsername => {
      db.prepare('INSERT OR IGNORE INTO answer_votes (answer_id, user_id, value) VALUES (?, ?, 1)').run(answerId, users[voterUsername].id);
    });
  });
}

addQnA('rohan', 'Why does my async function block the event loop?',
  'I have an async function in Node that seems to block everything else. What am I missing?',
  'Backend Engineering',
  [
    { username: 'devraj', body: 'You are likely running CPU-heavy synchronous work inside the async function. `async` only helps with I/O concurrency, not CPU-bound work. Move heavy computation to a worker thread.', url: 'https://nodejs.org/api/worker_threads.html', accepted: true, votes: ['sujay', 'meera', 'kabir', 'ishita'] },
    { username: 'meera', body: 'Also check if you are using a blocking loop like a large synchronous JSON.parse - that can freeze the event loop too.', votes: ['devraj'] },
  ]);

addQnA('meera', 'Best practices for prompting an LLM for structured JSON output?',
  'I keep getting malformed JSON back from my model calls. Any reliable patterns?',
  'Artificial Intelligence',
  [
    { username: 'ananya', body: 'Ask for JSON only with an explicit schema in the system prompt, set temperature low, and validate + retry on parse failure. Function calling / tool schemas are even more reliable when available.', url: 'https://platform.openai.com/docs/guides/structured-outputs', accepted: true, votes: ['sujay', 'ishita', 'zara'] },
    { username: 'sujay', body: 'I also strip markdown fences before parsing, models often wrap JSON in ```json blocks even when told not to.', votes: ['ananya'] },
  ]);

addQnA('zara', 'How do you decide between REST and GraphQL for a new API?',
  'Our frontend team wants flexible queries but our backend team prefers simplicity.',
  'Backend Engineering',
  [
    { username: 'devraj', body: 'If clients need very different shapes of data (mobile vs web) and over/under-fetching is a real problem, GraphQL earns its complexity. For a small team with simple, stable resources, REST is easier to cache, secure, and reason about.', accepted: true, votes: ['sujay', 'meera'] },
  ]);

addQnA('kabir', 'What is the actual difference between authentication and authorization?',
  'People use these interchangeably but I know they are not the same.',
  'Cybersecurity',
  [
    { username: 'devraj', body: 'Authentication proves who you are (login). Authorization decides what you are allowed to do once identified (permissions/roles). A valid JWT proves authentication; checking a role claim is authorization.', votes: ['kabir', 'sujay'] },
  ]);

addQnA('ishita', 'How do you choose the right chunk size for a RAG pipeline?',
  'My retrieval quality is inconsistent and I suspect my chunking strategy is the problem.',
  'Artificial Intelligence',
  [
    { username: 'sujay', body: 'Start around 300-500 tokens with ~15% overlap, then measure retrieval precision on a labeled eval set before tuning further. Semantic chunking (splitting on topic shifts) usually beats fixed-size chunking once you have enough documents to justify the extra complexity.', url: 'https://example.com/rag-chunking-notes', accepted: true, votes: ['ananya', 'ishita', 'devraj', 'meera', 'kabir'] },
  ]);

addQnA('zara', 'What is a reasonable way to cache expensive API responses?',
  'We recompute the same aggregation on every request and it is getting slow.',
  'Backend Engineering',
  [
    { username: 'sujay', body: 'Add a read-through cache (Redis) keyed on the query params, with a short TTL plus explicit invalidation on writes that affect that aggregation. Measure your cache hit rate before adding more complexity like cache warming.', accepted: true, votes: ['devraj', 'kabir'] },
  ]);

// Projects
function addProject(username, title, description, skillName, url, verifiersUsernames) {
  const existing = db.prepare('SELECT id FROM projects WHERE user_id = ? AND title = ?').get(users[username].id, title);
  let pid;
  if (existing) pid = existing.id;
  else {
    const info = db.prepare("INSERT INTO projects (user_id, title, description, skill_id, url, created_at) VALUES (?, ?, ?, ?, ?, datetime('now','-60 day'))")
      .run(users[username].id, title, description, skillId(skillName), url);
    pid = info.lastInsertRowid;
  }
  verifiersUsernames.forEach(v => {
    const already = db.prepare('SELECT 1 FROM project_verifications WHERE project_id = ? AND user_id = ?').get(pid, users[v].id);
    if (already) return;
    db.prepare('INSERT INTO project_verifications (project_id, user_id, comment) VALUES (?, ?, ?)').run(pid, users[v].id, 'Reviewed the code and it works as described.');
    db.prepare('UPDATE projects SET verified_count = verified_count + 1 WHERE id = ?').run(pid);
  });
}

addProject('sujay', 'TrustNet Reputation Engine', 'A weighted, anti-gaming reputation scoring system with recursive peer-endorsement weighting.', 'Artificial Intelligence', 'https://github.com/example/trustnet-engine', ['ananya', 'devraj', 'ishita']);
addProject('ananya', 'Real-time Object Detection Pipeline', 'YOLOv8-based pipeline deployed with ONNX runtime for edge inference.', 'Machine Learning', 'https://github.com/example/edge-detection', ['sujay', 'ishita']);
addProject('devraj', 'Horizontally Scaled Job Queue', 'Redis-backed distributed job queue handling 50k jobs/min with graceful backpressure.', 'Backend Engineering', 'https://github.com/example/job-queue', ['sujay', 'kabir']);
addProject('meera', 'Design System Component Library', 'A themeable React component library with 40+ accessible components.', 'Frontend Engineering', 'https://github.com/example/ui-kit', ['zara']);
addProject('rohan', 'Portfolio Website', 'My personal portfolio site.', 'Frontend Engineering', 'https://example.com/rohan-portfolio', []);

// Endorsements
function addEndorsement(from, to, skillName, evidence) {
  const already = db.prepare('SELECT 1 FROM endorsements WHERE endorser_id = ? AND target_id = ? AND skill_id = ?').get(users[from].id, users[to].id, skillId(skillName));
  if (already) return;
  db.prepare('INSERT INTO endorsements (endorser_id, target_id, skill_id, evidence) VALUES (?, ?, ?, ?)').run(users[from].id, users[to].id, skillId(skillName), evidence);
}
addEndorsement('devraj', 'sujay', 'Backend Engineering', 'Sujay redesigned our API layer and cut p99 latency by 40%.');
addEndorsement('ananya', 'sujay', 'Artificial Intelligence', 'Worked with him on a model deployment - deeply understands the fundamentals.');
addEndorsement('ishita', 'sujay', 'Artificial Intelligence', 'Reviewed his RAG pipeline design - solid architecture.');
addEndorsement('kabir', 'sujay', 'Artificial Intelligence', 'Sat in on his model eval walkthrough - rigorous and evidence-driven.');
addEndorsement('meera', 'sujay', 'Python', 'Paired with him on a data pipeline refactor - clean, well-tested code.');
addEndorsement('zara', 'sujay', 'Backend Engineering', 'His API docs made integrating with the frontend painless.');
addEndorsement('sujay', 'ananya', 'Machine Learning', 'Her detection pipeline is production-grade.');
addEndorsement('kabir', 'devraj', 'Backend Engineering', 'Rock solid infra work, survived a load test at 10x expected traffic.');
addEndorsement('zara', 'meera', 'UI/UX Design', 'Meera has a great eye for accessible, clean interfaces.');

// Posts
function addPost(username, content, skillName, evidenceUrl, likers, daysAgo) {
  const existing = db.prepare('SELECT id FROM posts WHERE user_id = ? AND content = ?').get(users[username].id, content);
  let pid;
  if (existing) pid = existing.id;
  else {
    const info = db.prepare(`INSERT INTO posts (user_id, content, skill_id, evidence_url, created_at) VALUES (?, ?, ?, ?, datetime('now', '-${daysAgo} day'))`)
      .run(users[username].id, content, skillName ? skillId(skillName) : null, evidenceUrl || '');
    pid = info.lastInsertRowid;
  }
  (likers || []).forEach(l => db.prepare('INSERT OR IGNORE INTO post_likes (post_id, user_id) VALUES (?, ?)').run(pid, users[l].id));
}

addPost('sujay', 'Shipped the trust-score decay logic today - reputation should require upkeep, not just a one-time win. Inactive accounts now taper toward baseline over 60 days.', 'Artificial Intelligence', '', ['ananya', 'devraj', 'ishita', 'meera'], 2);
addPost('ananya', 'Benchmarked three quantization methods on our vision model. INT8 gave us 3.2x speedup with under 1% accuracy loss.', 'Machine Learning', 'https://example.com/benchmark-report', ['sujay', 'ishita'], 5);
addPost('devraj', 'Hot take: most "microservices" horror stories are actually distributed monolith horror stories. The seams were never designed.', 'Backend Engineering', '', ['sujay', 'kabir', 'meera'], 8);
addPost('rohan', 'Just hit 50k followers! Thanks everyone 🎉', '', '', ['zara'], 3);
addPost('meera', 'Refactored our component library to use CSS variables for theming - dark mode now takes 10 minutes to add per component instead of 2 hours.', 'Frontend Engineering', 'https://example.com/theming-writeup', ['zara', 'rohan'], 6);
addPost('kabir', 'PSA: rotate your JWT secrets. Found three internal tools still using the default secret from a tutorial.', 'Cybersecurity', '', ['devraj', 'sujay'], 1);
addPost('ishita', 'Data quality > model complexity, every single time. Spent 3 days cleaning a dataset and our simple logistic regression beat last month\'s XGBoost model.', 'Data Science', '', ['ananya', 'sujay'], 4);

// Verification requests
function addVerificationRequest(from, to, skillName, message, status) {
  const already = db.prepare('SELECT id FROM verification_requests WHERE requester_id = ? AND reviewer_id = ? AND skill_id = ?').get(users[from].id, users[to].id, skillId(skillName));
  if (already) return;
  db.prepare(`INSERT INTO verification_requests (requester_id, reviewer_id, skill_id, message, status, resolved_at) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(users[from].id, users[to].id, skillId(skillName), message, status, status !== 'pending' ? new Date().toISOString() : null);
}
addVerificationRequest('sujay', 'devraj', 'Backend Engineering', 'We worked together on the job queue migration - could you verify my backend skills?', 'approved');
addVerificationRequest('meera', 'zara', 'UI/UX Design', 'Could you review my design system work?', 'approved');
addVerificationRequest('rohan', 'devraj', 'Backend Engineering', 'Would appreciate a review of my API project.', 'pending');

// Filler followers to illustrate the core thesis: followers != reputation.
// Rohan accumulates a large following with almost no verifiable evidence;
// Sujay has far fewer followers but a much higher, evidence-backed trust score.
for (let i = 1; i <= 42; i++) {
  const uname = `follower${i}`;
  const u = getOrCreateUser({ username: uname, displayName: `Reader ${i}`, headline: 'TrustNet member', createdOffset: '-20 day', activeOffset: '-10 day' });
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(u.id, users.rohan.id);
}
['ananya', 'devraj', 'meera', 'kabir'].forEach(u => {
  db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(users[u].id, users.sujay.id);
});
db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(users.sujay.id, users.devraj.id);
db.prepare('INSERT OR IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)').run(users.sujay.id, users.ananya.id);

console.log('Seed complete. Demo accounts (password: password123):');
people.forEach(p => console.log(`  - ${p.username}`));

  db.flush();
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
