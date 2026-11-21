// Keyboard + mouse state. WASD/arrows to move and drive, E to steal or
// enter a car, Space or click to shoot, R to reload, P/Esc to pause,
// Enter to start. The canvas translates mouse pixels to world aim.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
    // One-shot edge triggers, consumed by the game loop each frame.
    pressed: new Set(),
  };

  function keyName(e) {
    return e.key.length === 1 ? e.key.toLowerCase() : e.key;
  }

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    if (!input.keys.has(k)) input.pressed.add(k);
    input.keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouse.down = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouse.x = e.clientX - r.left;
    input.mouse.y = e.clientY - r.top;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      input.mouse.down = true;
      input.mouse.clicked = true;
    }
  });
  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });

  input.axis = function axis() {
    let x = 0;
    let y = 0;
    if (input.keys.has('a') || input.keys.has('ArrowLeft')) x -= 1;
    if (input.keys.has('d') || input.keys.has('ArrowRight')) x += 1;
    if (input.keys.has('w') || input.keys.has('ArrowUp')) y -= 1;
    if (input.keys.has('s') || input.keys.has('ArrowDown')) y += 1;
    return { x, y };
  };

  input.consumePressed = function consumePressed(k) {
    if (input.pressed.has(k)) {
      input.pressed.delete(k);
      return true;
    }
    return false;
  };

  input.endFrame = function endFrame() {
    input.pressed.clear();
    input.mouse.clicked = false;
  };

  return input;
}
