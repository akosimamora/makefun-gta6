// Keyboard + mouse state, shared by the loop and the screenshot stager.
export class Input {
  constructor() {
    this.keys = new Set();
    this.pressedQueue = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.clicked = false;
    this._down = (e) => {
      this.keys.add(e.code);
      this.pressedQueue.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    };
    this._up = (e) => this.keys.delete(e.code);
    this._move = (e) => {
      const r = e.target.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    };
    this._press = (e) => {
      this._move(e);
      this.mouseDown = true;
      this.clicked = true;
    };
    this._release = () => { this.mouseDown = false; };
  }
  attach(el) {
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
    el.addEventListener('mousemove', this._move);
    el.addEventListener('mousedown', this._press);
    window.addEventListener('mouseup', this._release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  axis() {
    let x = 0;
    let y = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) x -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) x += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) y -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) y += 1;
    return { x, y };
  }
  pressed(code) {
    return this.keys.has(code);
  }
  // Edge trigger: true exactly once per physical key press, even if the
  // press is shorter than one frame.
  consumePressed(code) {
    const hit = this.pressedQueue.has(code);
    this.pressedQueue.delete(code);
    return hit;
  }
  consumeClick() {
    const c = this.clicked;
    this.clicked = false;
    return c;
  }
}
