// Save / load through localStorage. Only totals are kept (best cash,
// jobs finished, best getaway) — the world itself is rebuilt fresh each
// session from the seed, so a save can never go stale.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { bestCash: 0, jobsDone: 0, bestGetaway: '' };
    const data = JSON.parse(raw);
    return {
      bestCash: typeof data.bestCash === 'number' ? data.bestCash : 0,
      jobsDone: typeof data.jobsDone === 'number' ? data.jobsDone : 0,
      bestGetaway: typeof data.bestGetaway === 'string' ? data.bestGetaway : '',
    };
  } catch {
    return { bestCash: 0, jobsDone: 0, bestGetaway: '' };
  }
}

export function storeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private mode or no storage: the game still plays, it just forgets.
  }
}
