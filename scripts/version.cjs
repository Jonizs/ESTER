// The game's version: 0.01 for every update to main since versioning began.
//
// It is counted off git rather than kept in a file, so every clone works out
// the same number for the same commit and nobody has to remember to bump it.
// Only first-parent commits count, so a merge is one update, not one plus
// everything that was merged in.
const { execSync } = require('node:child_process');

// The last commit before versioning began. The first commit after it is 0.01.
const BASE = 'd71d9f1';

function version() {
  try {
    const n = Number(execSync(`git rev-list --count --first-parent ${BASE}..HEAD`, {
      cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim());
    return (Math.max(1, n) / 100).toFixed(2);
  } catch {
    // No git, or a shallow clone without BASE in it (the Pages build).
    return 'dev';
  }
}

module.exports = { version };

if (require.main === module) console.log(version());
