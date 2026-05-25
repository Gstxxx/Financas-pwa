// Bundles the app and publishes a new release to GitHub. Pulls the auth
// token from the local `gh` CLI so the developer never has to copy/paste
// it into PowerShell. Run with `npm run release`.
//
// Prereq: `gh auth login` (one-time) and the version in package.json must
// be higher than the last published release.

import { spawnSync } from 'node:child_process';
import process from 'node:process';

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) {
    process.exit(r.status ?? 1);
  }
}

function getGhToken() {
  const r = spawnSync('gh', ['auth', 'token'], { shell: true, encoding: 'utf8' });
  if (r.status !== 0) {
    console.error('Failed to read token from `gh`. Run `gh auth login` first.');
    process.exit(1);
  }
  return r.stdout.trim();
}

const token = process.env.GH_TOKEN || getGhToken();
if (!token) {
  console.error('Empty GitHub token.');
  process.exit(1);
}

run('npm', ['run', 'build']);
run('npx', ['electron-builder', '--win', '--publish', 'always'], {
  env: { ...process.env, GH_TOKEN: token },
});

console.log('\nDraft release created on GitHub. Open the repo, review, and publish it.');
