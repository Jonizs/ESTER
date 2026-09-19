/**
 * The left-drag selection box.
 *
 * Left-press on the canvas and move: a box is drawn out under the cursor,
 * and whatever it covers when the button comes up is handed to `onBox`.
 * That is the gesture the camera used to have - the orbit is on the right
 * button now (`orbitCamera.js`), so the two never fight over a drag.
 *
 * Nothing here knows what is in the box. It only measures the rectangle in
 * screen pixels; deciding whether that is an agent to select or a stand of
 * trees to clear is `main.js`'s job.
 */

// How far the cursor has to travel before a press counts as a box rather
// than a click. The same 6 pixels the click handler forgives, so a press
// is either one or the other and never both.
const THRESHOLD = 6;

export function createSelectBox({ canvas, blocked, onBox }) {
  const box = document.getElementById('select-box');

  let press = null;        // where the button went down
  let dragging = false;

  function rect(a, b) {
    return {
      left: Math.min(a.x, b.x),
      top: Math.min(a.y, b.y),
      right: Math.max(a.x, b.x),
      bottom: Math.max(a.y, b.y)
    };
  }

  function draw(r) {
    box.hidden = false;
    box.style.left = `${r.left}px`;
    box.style.top = `${r.top}px`;
    box.style.width = `${r.right - r.left}px`;
    box.style.height = `${r.bottom - r.top}px`;
  }

  function stop() {
    press = null;
    dragging = false;
    box.hidden = true;
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (blocked?.()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    press = { x: event.clientX, y: event.clientY, id: event.pointerId };
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!press || event.pointerId !== press.id) return;

    const at = { x: event.clientX, y: event.clientY };
    if (!dragging) {
      if (Math.hypot(at.x - press.x, at.y - press.y) <= THRESHOLD) return;
      dragging = true;
      // Capture keeps the box alive once the cursor runs off the canvas; a
      // refused capture must not swallow the drag, hence the try.
      try { canvas.setPointerCapture(event.pointerId); } catch { /* no capture */ }
    }
    draw(rect(press, at));
  });

  function release(event) {
    if (!press || event.pointerId !== press.id) return;
    const was = dragging;
    const r = rect(press, { x: event.clientX, y: event.clientY });
    stop();
    if (was) onBox?.(r);
  }

  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', () => stop());

  return { isDragging: () => dragging, cancel: stop };
}
