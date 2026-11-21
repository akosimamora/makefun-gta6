// Boot and the one loop: canvas, input, sound, save, city, world, frames.

import { SEED } from './config.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave } from './save.js';
import { createWorld, updateWorld } from './world.js';
import { render } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

const input = createInput(canvas);
const audio = createAudio();
const save = loadSave();
const city = buildCity(SEED);
const world = createWorld(city, save);
window.__solmara = world; // for play-tests: state, shots fired, wanted level

// Screenshot staging: ?shot=chase|city|heist|start freezes a fixed scene.
const shot = new URLSearchParams(window.location.search).get('shot');
if (shot) applyShot(world, shot);

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  updateWorld(world, input, audio, dt, { w: canvas.width, h: canvas.height });
  render(ctx, world, { w: canvas.width, h: canvas.height });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
