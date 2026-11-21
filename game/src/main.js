// Boot and the one loop for Solmara. Input is read every frame, the world
// advances in fixed 1/60 s steps (several in a slow frame, none in a fast
// one), and the renderer paints what is there. The game moves between six
// screens: title, play, paused, busted, wasted and the story's end.
//
// ?seed=N fixes the city, the traffic and the pedestrians. ?shot=chase|city|
// heist|start (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { createRandom } from './random.js';
import { createCity } from './city.js';
import { createWorld, updateWorld, EVENT_BUSTED, EVENT_WASTED } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import {
  createRenderer, SCREEN_BUSTED, SCREEN_DONE, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, SCREEN_WASTED,
} from './render.js';
import { createAudio } from './audio.js';
import { loadSave, readBest, saveBest, saveGame } from './save.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;
const STEP = 1 / 60;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const city = createCity(rng);
const save = loadSave();
const world = createWorld(city, rng, save);
const renderer = createRenderer(canvas);
const audio = createAudio();
let best = readBest();

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let doneShown = false;

  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.player.health = 100;
    world.player.ammo = 12;
    world.busted = false;
    world.wasted = false;
    world.wanted.stars = 0;
    world.wanted.timer = 0;
    accumulator = 0;
    screen = SCREEN_PLAY;
    audio.unlock();
    announce(`Playing in Solmara. ${world.mission.done} jobs done.`);
  }

  function endRun(kind) {
    // Busted or wasted: the police or the hospital take $200, the heat is gone.
    world.player.cash = Math.max(0, world.player.cash - 200);
    world.player.health = 100;
    world.player.ammo = 12;
    world.wanted.stars = 0;
    world.wanted.timer = 0;
    world.wanted.cooling = false;
    world.busted = false;
    world.wasted = false;
    // Back to the safehouse, on foot, with a fresh car nearby.
    const s = city.spots.safehouse;
    world.player.x = s.x;
    world.player.y = s.y + 60;
    world.player.onFoot = true;
    world.player.carId = null;
    world.camera.x = world.player.x;
    world.camera.y = world.player.y;
    saveGame(world);
    if (world.player.cash > best) {
      best = world.player.cash;
      saveBest(best);
    }
    screen = kind === 'busted' ? SCREEN_BUSTED : SCREEN_WASTED;
    audio.busted();
    announce(kind === 'busted' ? 'Busted. The police took $200.' : 'Wasted. The hospital bill was $200.');
  }

  function step() {
    if (screen !== SCREEN_PLAY) return;
    const events = updateWorld(world, input, STEP);
    // Sound follows the world: the engine, the siren, the mission jingle.
    audio.engine(world.player.onFoot ? 0 : world.player.speed);
    audio.siren(world.wanted.stars >= 1);
    if (world.mission.done > 0 && world.mission.rating && !world.mission.jinglePlayed) {
      world.mission.jinglePlayed = true;
      audio.missionDone();
      saveGame(world);
      if (world.player.cash > best) {
        best = world.player.cash;
        saveBest(best);
      }
    }
    if (world.mission.allDone && !doneShown) {
      doneShown = true;
      screen = SCREEN_DONE;
      saveGame(world);
      announce('The debt is paid. Solmara is yours.');
      return;
    }
    if (events & EVENT_BUSTED) endRun('busted');
    else if (events & EVENT_WASTED) endRun('wasted');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen === SCREEN_TITLE || screen === SCREEN_BUSTED || screen === SCREEN_WASTED || screen === SCREEN_DONE) startGame();
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        saveGame(world);
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
      // The title screen pans slowly over the city.
      if (screen === SCREEN_TITLE) {
        world.camera.x = 1600 + Math.sin(world.time * 0.05) * 300;
        world.camera.y = 1200 + Math.cos(world.time * 0.04) * 200;
        world.time += STEP;
      }
    }
    renderer.draw(world, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      saveGame(world);
      announce('Paused.');
    }
  });

  announce('Solmara. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
