/**
 * Copies the built React app (client/dist) into server/public so a single
 * Node process can serve both the frontend and the API. Written in plain
 * Node.js (not shell commands like `rm -rf` / `cp -r`) so it runs
 * identically on Windows, macOS, and Linux with no manual edits needed.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const src = path.join(root, 'client', 'dist');
const dest = path.join(root, 'server', 'public');

if (!fs.existsSync(src)) {
  console.error(`Build output not found at ${src}. Did "npm run build --prefix client" run successfully?`);
  process.exit(1);
}

fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

console.log(`Copied ${src} -> ${dest}`);
