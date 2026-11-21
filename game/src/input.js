// Keyboard + mouse. A click is one-shot: mousedown stores it, takeClick()
// hands it out once, so a fast click is never lost between frames. A key
// press is one-shot the same way: takePressed() consumes it.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };
  let click = null;

  const onKeyDown = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    if (!keys.has(e.code)) pressed.add(e.code);
    keys.add(e.code);
  };
  const onKeyUp = (e) => keys.delete(e.code);
  const onMouseMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  };
  const onMouseDown = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    mouse.down = true;
    mouse.x = x;
    mouse.y = y;
    click = { x, y };
  };
  const onMouseUp = () => { mouse.down = false; };

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);

  return {
    /** Whether a key is held right now. */
    isDown: (code) => keys.has(code),
    /** WASD / arrow movement, as a unit-ish vector. */
    move: () => {
      let x = 0;
      let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      return { x, y };
    },
    run: () => keys.has('ShiftLeft') || keys.has('ShiftRight'),
    mouse,
    /** The pending click, once, or null. */
    takeClick: () => {
      const c = click;
      click = null;
      return c;
    },
    /** Whether the key was pressed since the last take, consumed once. */
    takePressed: (code) => {
      if (!pressed.has(code)) return false;
      pressed.delete(code);
      return true;
    },
    /** Drop every pending press (call when the screen changes). */
    clearPressed: () => pressed.clear(),
  };
}
