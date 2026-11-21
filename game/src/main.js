// Solmara boot: canvas, loop, screens, and the Playwright hook.
import { CONFIG } from './config.js';
import { Input } from './input.js';
import { AudioSys } from './audio.js';
import { loadSave, storeSave, freshSave } from './save.js';
import { World } from './world.js';
import { drawWorld } from './render.js';
import { stageScene, unfreeze } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CONFIG.viewW;
canvas.height = CONFIG.viewH;

const input = new Input();
input.attach(canvas);
const audio = new AudioSys();
let save = loadSave() || freshSave();
let world = new World(save, audio);
let screen = 'start';
let last = performance.now();
const cam = { x: 0, y: 0 };

function resetRun() {
  save = loadSave() || freshSave();
  world = new World(save, audio);
  screen = 'playing';
}

function clampCam() {
  cam.x = Math.max(0, Math.min(CONFIG.worldW - CONFIG.viewW, world.player.x - CONFIG.viewW / 2));
  cam.y = Math.max(0, Math.min(CONFIG.worldH - CONFIG.viewH, world.player.y - CONFIG.viewH / 2));
}

function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (screen === 'start' && (input.consumePressed('Enter') || input.consumeClick())) {
    audio.ensure();
    screen = 'playing';
    world.messageTimer = 6;
  } else if (screen === 'playing') {
    if (input.consumePressed('KeyP')) screen = 'paused';
    // aim with the mouse: player faces the cursor
    const wx = input.mouseX + cam.x;
    const wy = input.mouseY + cam.y;
    if (world.player.onFoot) world.player.angle = Math.atan2(wy - world.player.y, wx - world.player.x);
    world.update(dt, input);
    if (world.player.hp <= 0) {
      screen = 'wasted';
      storeSave(save);
    }
    if (world.missionDone && world.missionIndex >= 4) {
      screen = 'done';
      storeSave(save);
    }
    if (world.missionDone) world.missionDone = false;
  } else if (screen === 'paused') {
    if (input.consumePressed('KeyP')) screen = 'playing';
  } else if ((screen === 'busted' || screen === 'wasted' || screen === 'done') && input.consumePressed('Enter')) {
    resetRun();
  }
  if (world.wanted >= 5 && world.cops.length > 0 && world.player.hp <= 0) screen = 'wasted';
  clampCam();
  drawWorld(ctx, world, cam, screen);
  requestAnimationFrame(loop);
}

// Playwright hook: stage a frozen scene, start play, read state.
window.__solmara = {
  stage(name) {
    if (name === 'start') { screen = 'start'; world.frozen = false; return 'start'; }
    screen = 'playing';
    stageScene(world, name);
    clampCam();
    return name;
  },
  play() { unfreeze(world); screen = 'playing'; return 'playing'; },
  state() {
    return {
      screen,
      x: Math.round(world.player.x),
      y: Math.round(world.player.y),
      onFoot: world.player.onFoot,
      wanted: world.wanted,
      hp: Math.round(world.player.hp),
      ammo: world.player.ammo,
      cash: save.cash,
      jobsDone: save.jobsDone,
      mission: world.mission ? world.mission.title : null,
    };
  },
};

requestAnimationFrame(loop);
