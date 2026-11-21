// Saving Solmara: cash, standing, jobs finished and the best cash, kept in
// localStorage (this browser only). A save that cannot be read, or that is not
// shaped like one, is ignored and the game starts fresh — a corrupt save never
// stops the game.

import { BEST_KEY, SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    return {
      cash: typeof data.cash === 'number' ? data.cash : 250,
      rep: typeof data.rep === 'number' ? data.rep : 0,
      missionsDone: typeof data.missionsDone === 'number' ? data.missionsDone : 0,
    };
  } catch {
    return null;
  }
}

export function saveGame(world) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: Math.floor(world.player.cash),
      rep: Math.floor(world.player.rep),
      missionsDone: world.mission.done,
    }));
  } catch {
    // Storage can be off (private windows): the run then lasts this visit only.
  }
}

export function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

export function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(Math.floor(value)));
  } catch {
    // Storage can be off: the best then lasts this visit only.
  }
}
