// Solmara entry point: wires the city, the loop and the screens together.
import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, SEED } from './config.js';
import { makeRng } from './random.js';
import { buildCity } from './city.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { createMissions, getawayRank } from './missions.js';
import { createWorld, updateWorld } from './world.js';
import { render } from './render.js';
import { stageChase, stageCity, stageHeist, stageStart } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const rng = makeRng(SEED);
const city = buildCity(rng);
const world = createWorld(city, rng);
const input = createInput(canvas);
const audio = createAudio();
const missions = createMissions();
const save = loadSave();

let state = 'title';
let last = performance.now();
let view = { x: 0, y: 0 };
let endReason = '';
let endRank = '';

function clampView() {
  view.x = Math.max(0, Math.min(WORLD_W - VIEW_W, world.player.x - VIEW_W / 2));
  view.y = Math.max(0, Math.min(WORLD_H - VIEW_H, world.player.y - VIEW_H / 2));
}

function startGame() {
  audio.unlock();
  state = 'playing';
  input.clearQueue();
}

function finishRun(reason) {
  endReason = reason;
  endRank = getawayRank(world.wantedPeak, world.shotsFired);
  const p = world.player;
  p.cash = missions.cashEarned();
  if (p.cash > save.bestCash) save.bestCash = p.cash;
  if (missions.jobsDone() > save.jobsDone) save.jobsDone = missions.jobsDone();
  storeSave(save);
  state = reason === 'done' ? 'done' : reason;
}

function drawTitle() {
  ctx.fillStyle = '#0b0f14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 84px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SOLMARA', VIEW_W / 2, 220);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  ctx.fillText('A sun-soaked crime story — Mara Voss vs Elias Kross', VIEW_W / 2, 268);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ccc';
  ctx.fillText('WASD drive / walk   •   E steal or exit a car   •   Mouse aim, Click / Space shoot   •   R reload   •   P pause', VIEW_W / 2, 340);
  ctx.fillText('Four jobs. Five districts. One way out: get rich and get gone.', VIEW_W / 2, 372);
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText(`Best cash $${save.bestCash.toLocaleString()} · Jobs done ${save.jobsDone}/4`, VIEW_W / 2, 430);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 26px sans-serif';
  const blink = Math.sin(performance.now() / 300) > 0;
  if (blink) ctx.fillText('PRESS ENTER TO START', VIEW_W / 2, 500);
  ctx.textAlign = 'left';
}

function drawEnd(title, lines) {
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = title === 'BUSTED' ? '#ff2d2d' : title === 'WASTED' ? '#ff2d2d' : '#ffd700';
  ctx.font = 'bold 64px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW_W / 2, 260);
  ctx.fillStyle = '#fff';
  ctx.font = '20px sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, 320 + i * 34));
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText('Press Enter to play again', VIEW_W / 2, 520);
  ctx.textAlign = 'left';
}

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;

  if (state === 'title') {
    if (input.consumePressed('Enter')) startGame();
    drawTitle();
  } else if (state === 'playing') {
    if (input.consumePressed('KeyP')) { state = 'paused'; }
    else {
      updateWorld(world, input, dt, audio, view);
      const done = missions.checkArrival(world.player.x, world.player.y);
      if (done) {
        world.player.cash = missions.cashEarned();
        audio.missionDone();
        if (missions.isFinished()) finishRun('done');
      }
      if (world.busted) finishRun('busted');
      else if (world.wasted) finishRun('wasted');
      clampView();
      render(ctx, world, city, missions, view, save);
    }
  } else if (state === 'paused') {
    if (input.consumePressed('KeyP') || input.consumePressed('Enter')) state = 'playing';
    render(ctx, world, city, missions, view, save);
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, VIEW_H / 2);
    ctx.textAlign = 'left';
  } else {
    if (input.consumePressed('Enter')) location.reload();
    render(ctx, world, city, missions, view, save);
    if (state === 'busted') drawEnd('BUSTED', [`The Solmara PD got you.`, `Cash kept: $${world.player.cash.toLocaleString()}`, `Getaway rating: ${endRank}`]);
    else if (state === 'wasted') drawEnd('WASTED', [`You went down in ${missions.current() ? missions.current().name : 'Solmara'}.`, `Cash kept: $${world.player.cash.toLocaleString()}`, `Getaway rating: ${endRank}`]);
    else drawEnd('ALL JOBS DONE', [`Mara Voss walks away with $${world.player.cash.toLocaleString()}.`, `Getaway rating: ${endRank}`, `Elias Kross never saw it coming.`]);
  }

  requestAnimationFrame(frame);
}

// Screenshot mode: ?shot=chase|city|heist|start stages one frozen frame.
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  const stages = { chase: stageChase, city: stageCity, heist: stageHeist, start: stageStart };
  const stage = stages[shot];
  if (stage) {
    view = stage(world);
    if (shot === 'start') {
      drawTitle();
    } else {
      render(ctx, world, city, missions, view, save);
    }
    document.title = `solmara-shot-${shot}`;
  }
} else {
  requestAnimationFrame(frame);
}

// Test hooks for the Playwright check.
window.__solmara = {
  get state() { return state; },
  get player() { return world.player; },
  get world() { return world; },
  get missions() { return missions; },
  start: startGame,
};
