# TrustNet

> "What if social media had a reputation layer?"

TrustNet is a full-stack social platform where **reputation is computed from evidence, not claimed**. Instead of a follower count, every user gets a **Trust Score** built from accepted answers, peer endorsements, verified projects, consistency, and more — all shown in a fully transparent, itemized breakdown. Someone with 4 followers can (and does, in the seeded demo data) outrank someone with 40.

This is a real, working full-stack application: **React + Vite** frontend, **Node/Express + SQLite** backend, JWT auth, and a from-scratch reputation engine — not a mockup.

---

## ✨ Features

**Core thesis**
- **Trust Score engine** — a transparent, weighted algorithm combining 8 signals (accepted answers, helpful-answer votes, peer endorsements, project evidence, consistency, post quality, peer verification, account history). Every score comes with a full "ledger" showing exactly how it was computed.
- **Per-skill trust scores** — a "Skill Constellation" radial diagram shows separate scores per skill (e.g. Python 87, Backend 74, AI 91), each clickable for its own breakdown.
- **Followers are decoupled from reputation** — following/follower counts exist but never feed into the Trust Score.

**Anti-gaming design**
- Endorsements are weighted by the *endorser's own trust score* (a recursive, PageRank-style signal) and have diminishing returns for repeated endorsements from the same person.
- Trust **decays** if an account goes inactive for more than ~2 weeks — reputation must be maintained.
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

## 🗂 Project structure

```
trustnet/
├── server/            Node/Express API + SQLite database
│   ├── src/
│   │   ├── db/init.js         schema + seed skill list
│   │   ├── utils/trustEngine.js   the reputation algorithm
│   │   ├── utils/badges.js        achievement logic
│   │   ├── routes/                auth, users, posts, questions, projects, reputation
│   │   └── seed.js                demo data generator
│   └── package.json
├── client/            React + Vite + Tailwind v4 frontend
│   └── src/
│       ├── pages/     Feed, Questions, Projects, Leaderboard, Search, Profile, ...
│       ├── components/ TrustRing, TrustLedgerCard, SkillConstellation, Layout, ...
│       └── context/AuthContext.jsx
└── package.json       root convenience scripts (runs both together locally)
```

---

## 🚀 Running locally

Requires Node.js 18+.

```bash
# 1. Install everything (root, server, client)
npm run install:all

# 2. Seed demo data (creates server/data/trustnet.db with 8 realistic
#    profiles, posts, Q&A, projects, endorsements, and 42 filler followers
#    to demonstrate the "followers ≠ trust" thesis)
npm run seed

# 3. Run both server (port 4000) and client (port 5173) together
npm run dev
```

Then open **http://localhost:5173**.

Demo accounts (password for all: `password123`): `sujay`, `ananya`, `devraj`, `meera`, `kabir`, `zara`, `rohan`, `ishita`.
Compare `sujay` (few followers, high trust) with `rohan` (many followers, low trust) on the Leaderboard page to see the core thesis in action.

You can also run each side separately:
```bash
npm run dev:server   # http://localhost:4000
npm run dev:client   # http://localhost:5173 (proxies /api to :4000 automatically)
```

---

## ☁️ Deploying (GitHub → Vercel)

This app has two parts that deploy differently:

- **Frontend (`client/`)** — a static Vite build. Deploys perfectly on **Vercel**.
- **Backend (`server/`)** — an always-on Node process with a **SQLite file on disk**. Vercel's serverless functions are stateless and don't keep a writable disk between requests, so SQLite won't reliably persist there. Deploy the backend to a host with a persistent process + disk instead — **Render** (free tier) is the easiest and is pre-configured here with `server/render.yaml`. Railway or Fly.io work the same way.

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "TrustNet"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

### Step 2 — Deploy the backend (Render)
1. Go to [render.com](https://render.com) → **New → Web Service** → connect your GitHub repo.
2. Render will detect `server/render.yaml` automatically (or set these manually):
   - **Root directory:** `server`
   - **Build command:** `npm install`
   - **Start command:** `npm run seed && npm start`
   - **Add a Disk:** mount path `/var/data`, and set env var `DATA_DIR=/var/data` (already in the blueprint)
3. Set env vars: `JWT_SECRET` (any long random string), `FRONTEND_URL` (fill in after step 3, comma-separated if multiple).
4. Deploy. Copy the resulting URL, e.g. `https://trustnet-api.onrender.com`.

### Step 3 — Deploy the frontend (Vercel)
1. Go to [vercel.com](https://vercel.com) → **New Project** → import the same repo.
2. **Root directory:** `client`
3. Framework preset: **Vite** (build command `npm run build`, output dir `dist` — Vercel detects this automatically).
4. Add an environment variable:
   - `VITE_API_BASE` = `https://trustnet-api.onrender.com/api` (your Render URL + `/api`)
5. Deploy. Vercel gives you a URL like `https://trustnet.vercel.app`.

### Step 4 — Close the loop
Go back to Render and set `FRONTEND_URL=https://trustnet.vercel.app` (your Vercel URL) so CORS allows it, then redeploy the backend.

That's it — the frontend on Vercel now talks to the backend on Render, with data persisting properly on disk.

> **Note:** Render's free tier spins down after inactivity, so the first request after idling can take ~30–50 seconds to wake up. This is a Render limitation, not a bug in the app.

---

## 🧪 Notes for grading / demo

- All 8 seeded profiles have real, interconnected activity (answers, votes, endorsements, verified projects) so the Trust Score, badges, and leaderboard are meaningful out of the box — no need to manually create data to see the algorithm work.
- Every trust score on every profile is **computed live** from the database on each page load — nothing is hardcoded.
- The `/api/trust/:username` endpoint (used by the profile page) returns the full breakdown as JSON if you want to inspect the algorithm directly, e.g. `GET /api/trust/sujay`.
