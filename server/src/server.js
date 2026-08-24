require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const db = require('./db/init');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');
const questionRoutes = require('./routes/questions');
const projectRoutes = require('./routes/projects');
const reputationRoutes = require('./routes/reputation');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : true,
  credentials: false,
}));
app.use(express.json());
app.use(morgan('dev'));

app.get('/api/health', (req, res) => res.json({ ok: true, name: 'TrustNet API' }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api', reputationRoutes);

// If the frontend's production build exists alongside the server (see
// render-single-service.yaml / README), serve it too - so ONE Render service
// can host both the API and the React app together, with no CORS or second
// deployment needed. This is optional: if CLIENT_DIST isn't found, the
// server just runs as an API-only service like before.
const CLIENT_DIST = process.env.CLIENT_DIST || path.join(__dirname, '..', 'public');
if (fs.existsSync(path.join(CLIENT_DIST, 'index.html'))) {
  app.use(express.static(CLIENT_DIST));
  app.get(/^(?!\/api).*/, (req, res) => {
    res.sendFile(path.join(CLIENT_DIST, 'index.html'));
  });
}

app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our end. Please try again.' });
});

async function main() {
  await db.ready(); // wait for the WASM SQLite driver + schema before serving traffic
  app.listen(PORT, () => {
    console.log(`TrustNet API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start TrustNet API:', err);
  process.exit(1);
});
