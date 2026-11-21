// Keyboard + mouse, with edge-triggered presses the game loop consumes.
window.SOL = window.SOL || {};
SOL.input = {
  keys: {},
  pressed: {},
  mouse: { x: 0, y: 0, down: false, clicked: false },
  attach(canvas) {
    window.addEventListener('keydown', (e) => {
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
    window.addEventListener('blur', () => { this.keys = {}; this.mouse.down = false; });
  },
  down(code) { return !!this.keys[code]; },
  hit(code) { const v = !!this.pressed[code]; delete this.pressed[code]; return v; },
  click() { const v = this.mouse.clicked; this.mouse.clicked = false; return v; },
  endFrame() { this.pressed = {}; this.mouse.clicked = false; },
};
