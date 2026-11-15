// npm run build:exe - package the game, then put a numbered copy beside it.
//
// dist-exe/ESTER.exe stays the one this machine runs: WATCH.bat and the
// desktop shortcut both launch it by that name. ESTER-<version>.exe is the
// same file, named for handing out, so a tester's copy says which update
// it is. Older numbered copies are left where they are.
const fs = require('node:fs');
const path = require('node:path');
const { execSync } = require('node:child_process');
const { version } = require('./version.cjs');

const root = path.join(__dirname, '..');
const v = version();
execSync('npx electron-builder --win portable --publish never', { cwd: root, stdio: 'inherit' });

const exe = path.join(root, 'dist-exe', 'ESTER.exe');
const named = path.join(root, 'dist-exe', `ESTER-${v}.exe`);
fs.copyFileSync(exe, named);
console.log(`[ESTER] version ${v}: ${path.relative(root, named)}`);
