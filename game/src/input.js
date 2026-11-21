// Keyboard and mouse input for Solmara. Held keys give a movement direction
// (and, in a car, throttle, steering and brake); one-shot presses (enter a car,
// confirm, pause, mute) are queued as flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. The mouse
// aims Mara's pistol: its screen position converts to a world position
// through the camera, so a click shoots where the player points.

import { KEY } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;

const has = (list, code) => list.includes(code);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let enterQueued = false;
  let mouseX = 0;
  let mouseY = 0;
  let mouseHeld = false;
  // A one-shot for a click: set on mousedown, read and cleared by the next
  // world step. A very quick click still registers, even if no frame falls
  // between the press and the release.
  let clicked = false;

  window.addEventListener('keydown', (event) => {
    if (has(KEY.confirm, event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (has(KEY.pause, event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (has(KEY.mute, event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (has(KEY.enter, event.code)) {
      if (!event.repeat) enterQueued = true;
    } else if (has(KEY.up, event.code) || has(KEY.down, event.code) || has(KEY.left, event.code)
      || has(KEY.right, event.code) || has(KEY.run, event.code) || has(KEY.brake, event.code)) {
      // A movement key: fall through to record it below.
    } else {
      return;
    }
    keys.add(event.code);
    if (has(KEY.up, event.code) || has(KEY.down, event.code) || has(KEY.left, event.code)
      || has(KEY.right, event.code) || has(KEY.brake, event.code) || has(KEY.confirm, event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    mouseHeld = false;
  });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      mouseHeld = true;
      clicked = true;
      const rect = canvas.getBoundingClientRect();
      mouseX = event.clientX - rect.left;
      mouseY = event.clientY - rect.top;
    }
  });
  window.addEventListener('mouseup', (event) => {
    if (event.button === 0) mouseHeld = false;
  });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  const down = (list) => list.some((code) => keys.has(code));

  return {
    // A 2D movement direction, {x, y}, normalized by the caller.
    direction() {
      return {
        x: (down(KEY.right) ? 1 : 0) - (down(KEY.left) ? 1 : 0),
        y: (down(KEY.down) ? 1 : 0) - (down(KEY.up) ? 1 : 0),
      };
    },
    up: () => down(KEY.up),
    down: () => down(KEY.down),
    left: () => down(KEY.left),
    right: () => down(KEY.right),
    run: () => down(KEY.run),
    brake: () => down(KEY.brake),
    // Whether the E key was pressed since the last call (enter/exit a car).
    takeEnter() {
      const taken = enterQueued;
      enterQueued = false;
      return taken;
    },
    // The one-shot presses since the last call, as ACTION_* flags.
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // Whether the left mouse button is held (shoot).
    mouseDown: () => mouseHeld,
    // A click, once: the next call returns false until the next press.
    takeClick() {
      const was = clicked;
      clicked = false;
      return was;
    },
    // The mouse position in world units, through the camera.
    mouseWorld(camera) {
      const viewW = canvas.width;
      const viewH = canvas.height;
      const scale = Math.min(viewW / 1280, viewH / 720) * camera.zoom;
      const ox = (viewW - 1280 * scale) / 2;
      const oy = (viewH - 720 * scale) / 2;
      const shakeX = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
      const shakeY = camera.shake > 0 ? (Math.random() - 0.5) * camera.shake : 0;
      return {
        x: camera.x + (mouseX - ox - 640 * scale) / scale + shakeX,
        y: camera.y + (mouseY - oy - 360 * scale) / scale + shakeY,
      };
    },
  };
}
