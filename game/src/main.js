// SOLMARA — entry point. Wires input, city, world, missions, render
// and audio into one game loop, owns the screen state machine
// (start / playing / paused / busted / wasted / done), and stages
// screenshot presets from the URL (?shot=chase|city|heist|start).
import { DISTRICTS } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { sound } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { createMissionState, completeMission, getawayRating } from './missions.js';
import { createWorld, updateWorld } from './world.js';
import { render } from './render.js';
import { shotFromUrl, applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const SEED = 20261121;

const input = createInput(canvas);
const rng = makeRng(SEED);
const city = buildCity(rng);
city.districts = DISTRICTS;
const save = loadSave();

let world = createWorld(city, rng);
let missionState = createMissionState();
missionState.rep = { palmera: false, marina: false, oldtown: false, palm: false, docks: false };
let screen = 'start';
const cam = { x: world.player.x, y: world.player.y };

const view = { world, city, screen: 'start', missionState, save, cam };

function resetRun() {
  const freshRng = makeRng(SEED);
  world = createWorld(city, freshRng);
  missionState = createMissionState();
  missionState.rep = { palmera: false, marina: false, oldtown: false, palm: false, docks: false };
  view.world = world;
  view.missionState = missionState;
  cam.x = world.player.x;
  cam.y = world.player.y;
}

function startPlaying() {
  resetRun();
  screen = 'playing';
  view.screen = 'playing';
  sound.unlock();
  sound.mission();
  save.runs += 1;
  storeSave(save);
}

function finishRun() {
  missionState.rating = getawayRating(world.maxHeatSeen);
  save.bestCash = Math.max(save.bestCash, missionState.cash);
  save.jobsDone = 4;
  storeSave(save);
  screen = 'done';
  view.screen = 'done';
  sound.mission();
}

// --- Screenshot presets: stage the world, then play immediately so
// the shot is alive (traffic moving, cops closing in, heli tracking).
const { shot, seed } = shotFromUrl();
if (shot) {
  const rngShot = makeRng(SEED + seed);
  world = createWorld(city, rngShot);
  missionState = createMissionState();
  missionState.rep = { palmera: false, marina: false, oldtown: false, palm: false, docks: false };
  view.world = world;
  view.missionState = missionState;
  applyShot(world, shot);
  if (world.missionOverride !== null && world.missionOverride !== undefined) {
    missionState.index = world.missionOverride;
    missionState.maxHeat = world.wantedHeat;
  }
  if (shot === 'start') {
    screen = 'start';
  } else {
    screen = 'playing';
    sound.unlock();
  }
  view.screen = screen;
  cam.x = world.player.x;
  cam.y = world.player.y;
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  // Global keys.
  if (input.consumePressed('Enter')) {
    sound.unlock();
    if (screen === 'start') startPlaying();
    else if (screen === 'busted' || screen === 'wasted' || screen === 'done') {
      screen = 'start';
      view.screen = 'start';
      resetRun();
    }
  }
  if ((input.consumePressed('p') || input.consumePressed('P') || input.consumePressed('Escape')) && screen === 'playing') {
    screen = 'paused';
    view.screen = 'paused';
    sound.siren(false);
  } else if ((input.consumePressed('p') || input.consumePressed('P') || input.consumePressed('Escape')) && screen === 'paused') {
    screen = 'playing';
    view.screen = 'playing';
  }

  if (screen === 'playing') {
    const result = updateWorld(world, input, dt, missionState, sound);
    if (result.missionDone) {
      const done = completeMission(missionState, missionState.rep);
      if (done) {
        sound.mission();
        sound.pickup();
        if (missionState.done) finishRun();
      }
    }
    if (result.status === 'busted') {
      screen = 'busted';
      view.screen = 'busted';
      sound.siren(false);
      sound.busted();
      save.bestCash = Math.max(save.bestCash, missionState.cash);
      storeSave(save);
    } else if (result.status === 'wasted') {
      screen = 'wasted';
      view.screen = 'wasted';
      sound.siren(false);
      sound.busted();
      save.bestCash = Math.max(save.bestCash, missionState.cash);
      storeSave(save);
    }
  }

  view.screen = screen;
  render(ctx, view);
  input.endFrame();
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
