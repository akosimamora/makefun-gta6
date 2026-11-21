// Entry: canvas, loop and wiring. Reads ?shot=<name> for the screenshot
// scenes (render one staged frame and stop), otherwise runs the playable
// game. Saves best cash / jobs done whenever a mission lands.
import { createWorld, updateWorld } from './world.js';
import { drawWorld } from './render.js';
import { createInput } from './input.js';
import { sfx } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const save = loadSave();
const input = createInput(canvas);
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

let world;
if (shotName) {
  world = stageShot(shotName);
  // One staged frame, then freeze so the capture is deterministic.
  drawWorld(ctx, world, save);
} else {
  world = createWorld(20261121);
  let last = performance.now();
  let savedJobs = save.jobsDone;
  let savedCash = save.bestCash;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (input.wasPressed('m')) sfx.toggleMute();
    updateWorld(world, input, dt);
    if (world.missionIndex > savedJobs) {
      savedJobs = world.missionIndex;
      save.jobsDone = savedJobs;
      save.bestCash = Math.max(savedCash, world.cash);
      savedCash = save.bestCash;
      save.bestGetaway = world.getaway || save.bestGetaway;
      storeSave(save);
    }
    if (world.cash > savedCash) {
      savedCash = world.cash;
      save.bestCash = savedCash;
      storeSave(save);
    }
    drawWorld(ctx, world, save);
    input.endFrame();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
