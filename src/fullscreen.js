/**
 * The game opens full screen.
 *
 * In the desktop shell that is the window's own `fullscreen: true`
 * (electron/main.cjs) and nothing here is needed. In a browser - the Pages
 * build - full screen can only be asked for from inside a user gesture, so
 * the request is queued and fired on the first click or key press the page
 * sees, whichever comes first. It is asked for once and never again: a player
 * who leaves full screen with F11 or Esc is not dragged back into it.
 */
export function autoFullscreen() {
  // Electron already opened full screen; window.ester is only there in the
  // desktop shell (electron/preload.cjs).
  if (window.ester) return;

  const root = document.documentElement;
  if (!root.requestFullscreen) return;

  let asked = false;

  function ask() {
    if (asked) return;
    asked = true;
    window.removeEventListener('pointerdown', ask, true);
    window.removeEventListener('keydown', ask, true);
    // A refused request must not take the gesture down with it - the same
    // click is still an order to the agent.
    root.requestFullscreen().catch(() => {});
  }

  if (document.fullscreenElement) return;
  window.addEventListener('pointerdown', ask, true);
  window.addEventListener('keydown', ask, true);
}
