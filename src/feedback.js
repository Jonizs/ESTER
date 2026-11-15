/**
 * The playtest page in the pause menu: a few 0-5 bars and a line of comments.
 *
 * SAVE writes it all down as a text file - on the Desktop in the desktop
 * build (via `window.ester.saveFeedback`), as a download in a browser - so a
 * tester can send the file back. Nothing is uploaded anywhere.
 */
export const FEEDBACK_CATEGORIES = ['Fun', 'Controls', 'Visuals', 'Sound', 'Overall'];

export function createFeedback(root) {
  const list = root.querySelector('#feedback-bars');
  const comment = root.querySelector('#feedback-comment');
  const status = root.querySelector('#feedback-status');
  const ratings = Object.fromEntries(FEEDBACK_CATEGORIES.map((c) => [c, 0]));
  const rows = new Map();
  const startedAt = Date.now();

  for (const category of FEEDBACK_CATEGORIES) {
    const row = document.createElement('div');
    row.className = 'rating';
    const name = document.createElement('span');
    name.textContent = category;
    const bars = document.createElement('div');
    bars.className = 'bars';
    const value = document.createElement('span');
    value.className = 'value';
    for (let i = 1; i <= 5; i++) {
      const bar = document.createElement('button');
      bar.type = 'button';
      bar.className = 'bar';
      bar.setAttribute('aria-label', `${category} ${i} of 5`);
      // Clicking the value already set takes it back down to 0.
      bar.addEventListener('click', () => {
        ratings[category] = ratings[category] === i ? 0 : i;
        draw();
      });
      bars.append(bar);
    }
    row.append(name, bars, value);
    list.append(row);
    rows.set(category, { bars: [...bars.children], value });
  }

  function draw() {
    for (const [category, { bars, value }] of rows) {
      bars.forEach((bar, i) => bar.classList.toggle('on', i < ratings[category]));
      value.textContent = `${ratings[category]}/5`;
    }
  }

  function report() {
    const minutes = Math.round((Date.now() - startedAt) / 60000);
    const lines = [
      'ESTER playtest feedback',
      `Date: ${new Date().toLocaleString()}`,
      `Played this session: ~${minutes} min`,
      '',
      ...FEEDBACK_CATEGORIES.map((c) => `${c.padEnd(9)} ${'#'.repeat(ratings[c])}${'-'.repeat(5 - ratings[c])}  ${ratings[c]}/5`),
      '',
      'Comments:',
      comment.value.trim() || '(none)',
      ''
    ];
    return lines.join('\r\n');
  }

  async function save() {
    const text = report();
    const name = `ESTER-feedback-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.txt`;
    try {
      if (window.ester?.saveFeedback) {
        const where = await window.ester.saveFeedback(name, text);
        status.textContent = `Saved to ${where} - send that file back. Thanks!`;
      } else {
        const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
        const a = Object.assign(document.createElement('a'), { href: url, download: name });
        a.click();
        URL.revokeObjectURL(url);
        status.textContent = 'Downloaded - send that file back. Thanks!';
      }
      return true;
    } catch (err) {
      status.textContent = `Could not save: ${err?.message ?? err}`;
      return false;
    }
  }

  draw();
  return { save, report, clearStatus: () => { status.textContent = ''; } };
}
