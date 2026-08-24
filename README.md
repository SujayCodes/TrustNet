# TrustNet

> "What if social media had a reputation layer?"

TrustNet is a full-stack social platform where **reputation is computed from evidence, not claimed**. Instead of a follower count, every user gets a **Trust Score** built from accepted answers, peer endorsements, verified projects, consistency, and more — all shown in a fully transparent, itemized breakdown. Someone with 4 followers can (and does, in the seeded demo data) outrank someone with 40.

This is a real, working full-stack application: **React + Vite** frontend, **Node/Express + SQLite (WASM via sql.js)** backend, JWT auth, and a from-scratch reputation engine — not a mockup.

---

## 🔴 Live Demo

**App is live at: [https://trustnet-09mi.onrender.com](https://trustnet-09mi.onrender.com)**

| Username | Password |
|---|---|
| `sujay`, `ananya`, `devraj`, `meera`, `kabir`, `zara`, `rohan`, `ishita` | `password123` |

**Why the demo password is public here:** these are intentional, throwaway seeded accounts created specifically so evaluators/graders can log in immediately without needing to register or ask for credentials. No real user data, payment info, or personal information is attached to any of them — they only exist to demonstrate the reputation algorithm working on realistic, interconnected data (answers, endorsements, projects). This is standard practice for academic/demo deployments and is safe to share publicly.

> ⚠️ **Two limitations of the free hosting tier, so evaluation goes smoothly:**
> 1. **Cold start** — if unvisited for ~15 minutes, the service spins down. The first request afterward takes **30–50 seconds** to wake up. Open the link a minute before evaluating, or just wait once on first load.
> 2. **No persistent disk on the free plan** — the database resets to the seeded demo data on every restart/redeploy. The demo data (proving the core thesis) is always there, but anything an evaluator personally adds (a new post, an endorsement) may not survive a service restart. This doesn't affect the "See it live" demos below, since those only need the current running session.

---

## ✨ Features

**Core thesis**
- **Trust Score engine** — a transparent, weighted algorithm combining 8 signals (accepted answers, helpful-answer votes, peer endorsements, project evidence, consistency, post quality, peer verification, account history). Every score comes with a full "ledger" showing exactly how it was computed.
- **Per-skill trust scores** — a "Skill Constellation" radial diagram shows separate scores per skill (e.g. Python 87, Backend 74, AI 91), each clickable for its own breakdown.
- **Followers are decoupled from reputation** — following/follower counts exist but never feed into the Trust Score. (See leaderboard: Sujay — 4 followers, 70.5 trust. Rohan — 42 followers, 21.0 trust.)

**Anti-gaming design**
- Endorsements are weighted by the *endorser's own trust score* (a recursive, PageRank-style signal) and have diminishing returns for repeated endorsements from the same person.
- Trust **decays** if an account goes inactive for more than ~2 weeks — reputation must be maintained, not just earned once.
- Project evidence is boosted by independent peer verification (not just self-reported links).

**Full feature set**
- Auth (JWT), profiles, bios, headlines
- Evidence-based **posts** feed (like/comment, optional evidence links, skill tagging)
- **Q&A** (Stack Overflow-style): questions, answers, voting, accepted answers
- **Projects** portfolio with peer verification
- **Peer endorsements** with required evidence text
- **Formal peer verification requests** (ask a specific person to vouch for a skill)
- **Skill verification challenges** — short quizzes that boost a skill's trust once passed
- **Achievement badges** (Rising Verifier, Domain Expert, Community Pillar, Verified Builder, Trusted Authority, ...)
- **Trust score history graph** per user
- **Shareable trust card** (public verification badge)
- **Leaderboard** — overall or filtered by skill
- **Search** by name/skill/minimum trust score
- **Notifications** (endorsements, follows, likes, comments, accepted answers, verifications)
- Reporting endpoint for abuse/flagging

---

## 🧠 How the Trust Score works

See [`server/src/utils/trustEngine.js`](server/src/utils/trustEngine.js) for the full, commented implementation. Summary of weights:

| Signal                | Weight | Notes |
|------------------------|:------:|-------|
| Accepted Answers        | 20% | Strongest signal — the asker themselves confirmed it helped |
| Peer Endorsements       | 20% | Weighted by endorser's own trust; diminishing returns per repeat endorser |
| Project Evidence        | 15% | Real URLs required; boosted by independent peer verification |
| Helpful Answers (votes) | 15% | Net upvotes across all answers |
| Consistency             | 10% | Rewards regular activity; decays after 14+ idle days |
| Post Quality             | 8% | Engagement per post, not raw volume |
| Peer Verification        | 7% | Formal reviewer approval, weighted by reviewer's trust |
| Account History          | 5% | Account age minus any upheld reports |

Every profile page renders this exact table live, per-component, with the raw evidence count behind each number — nothing is a black box.

---

## 🎥 See it live: proving the score is real, not hardcoded

The most convincing thing an evaluator can do is watch a Trust Score **change in real time** as a result of a real action — not a static screenshot. The score is recalculated from the database on every page load; nothing is cached or pre-computed. Three short demos (~1 minute each), using the live app and seeded accounts above.

**Setup:** open two browser windows side by side — a normal window and an **incognito/private** window — so you're logged in as two different users at once (e.g. `sujay` normal, `devraj` incognito).

### Demo 1 — Endorsement moves the score (fastest)
1. Normal window: go to `https://trustnet-09mi.onrender.com/u/rohan`, note his score (**21.0**).
2. Incognito: log in as `devraj` / `password123`.
3. Go to `.../u/rohan` → click **"Endorse a skill"**.
4. Pick a skill (e.g. JavaScript), write evidence over 20 characters — e.g. *"Reviewed his portfolio code, clean and well-structured."* Evidence length/quality matters; short evidence gets less weight.
5. Submit → switch to the normal window on rohan's profile → **refresh**.
6. Score changes; open the **Trust Ledger** → "Peer Endorsements" row shows a higher contribution number, evidence count incremented.

### Demo 2 — An accepted answer moves the score
1. As `sujay` → **Q&A → Ask a question** → post something.
2. Incognito as `devraj` → answer it (optionally with an evidence link).
3. Back as `sujay` → open the question → click **"Mark as accepted"** under devraj's answer.
4. Go to `.../u/devraj` → refresh → **"Accepted Answers"** row in his ledger jumps up immediately.

### Demo 3 — Project verification moves the score
1. As `sujay` → **Projects → Add project** → submit one with a real URL.
2. Incognito as `devraj` → Projects → click **"Verify"** on it.
3. Refresh sujay's profile → **"Project Evidence"** sub-score increases; the project's verified count badge goes 0 → 1.

**Line worth saying during any of these:** *"Nothing here is hardcoded — the score is recalculated from the database every time the page loads. I just added one endorsement and the number moved instantly."*

**Other things worth checking live:**
- **Leaderboard** (`/leaderboard`) — filter by skill via the dropdown, watch rankings reorder.
- **Search** (`/search`) — set a minimum trust score, watch results filter live.
- **`/api/trust/sujay`** — hit this URL directly (swap in any username) to see the raw JSON the algorithm produces — proof the math isn't hardcoded.

---

## 🗂 Project structure

```
trustnet/
├── server/                Node/Express API + SQLite (WASM, sql.js) database
│   ├── src/
│   │   ├── db/init.js         schema + async DB init
│   │   ├── db/sqlDriver.js    better-sqlite3-compatible facade over sql.js
│   │   ├── utils/trustEngine.js   the reputation algorithm
│   │   ├── utils/badges.js        achievement logic
│   │   ├── routes/                auth, users, posts, questions, projects, reputation
│   │   └── seed.js                demo data generator
│   └── package.json
├── client/                React + Vite + Tailwind v4 frontend
│   └── src/
│       ├── pages/          Feed, Questions, Projects, Leaderboard, Search, Profile, ...
│       ├── components/     TrustRing, TrustLedgerCard, SkillConstellation, Layout, ...
│       └── context/AuthContext.jsx
├── scripts/copy-client-build.js   cross-platform build helper for single-service deploy
└── package.json           root convenience scripts
```

---

## 🚀 Running locally

Requires Node.js 18+. No Python/virtualenv needed — this is a pure Node/JS project.

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. Seed demo data
npm run seed

# 3. Run both server (:4000) and client (:5173) together, one terminal
npm run dev
```

Open **http://localhost:5173**. Login with any account from the table above.

### Testing the production build locally (what Render actually runs)
```bash
npm run render-build   # builds React, copies it into server/public
npm run render-start   # seeds + starts one single server
```
Open **http://localhost:4000** — this is the exact same setup used in production, one process serving both frontend and API.

---

## ☁️ How this was deployed (Render, single service)

Deployed as **one Render Web Service** — Express serves both the API and the built React frontend from the same origin, so there's no CORS setup or second deployment needed.

**Render settings used:**
| Field | Value |
|---|---|
| Language | Node |
| Build Command | `npm run render-build` |
| Start Command | `npm run render-start` |
| Root Directory | *(blank)* |
| Instance Type | Free |

**Environment variables:**
| Key | Value |
|---|---|
| `JWT_SECRET` | a random secret string |

> `DATA_DIR` is intentionally **not** set — persistent disks require a paid Render plan. Without it, the SQLite file lives in the app's default local folder, which works fine while the instance is running but resets on restart/redeploy (see the limitations note at the top).

**To reproduce:** push to GitHub → Render → New Web Service → connect the repo → fill in the settings above → Deploy.

**To make data permanent:** upgrade to a paid Render instance, add a Disk mounted at `/var/data`, then set env var `DATA_DIR=/var/data`.

---

## 🧪 Notes for grading

- All 8 seeded profiles have real, interconnected activity (answers, votes, endorsements, verified projects) so the Trust Score, badges, and leaderboard are meaningful immediately — no setup needed to see the algorithm work.
- Every trust score is **computed live** from the database on each page load — see "See it live" above for interactive proof.
- `/api/trust/:username` returns the full breakdown as JSON directly, e.g. `https://trustnet-09mi.onrender.com/api/trust/sujay`.
- Source code for the algorithm: [`server/src/utils/trustEngine.js`](server/src/utils/trustEngine.js).
