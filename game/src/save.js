// Save game: best cash earned in one run and jobs finished, kept in
// localStorage so the start screen can show them. Never throws —
// storage can be unavailable (private mode) and the game must not care.
const KEY = 'solmara-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { bestCash: 0, jobsDone: 0, runs: 0 };
    const data = JSON.parse(raw);
    return {
      bestCash: typeof data.bestCash === 'number' ? data.bestCash : 0,
      jobsDone: typeof data.jobsDone === 'number' ? data.jobsDone : 0,
      runs: typeof data.runs === 'number' ? data.runs : 0,
    };
  } catch (err) {
    return { bestCash: 0, jobsDone: 0, runs: 0 };
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch (err) {
    // Storage unavailable — the run still counts, it just is not kept.
  }
}
