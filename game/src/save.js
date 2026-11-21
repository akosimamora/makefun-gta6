// localStorage save: cash, jobs done, best getaway, district REP.
const KEY = 'solmara-save-v1';

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (typeof s.cash !== 'number') return null;
    return s;
  } catch (_e) {
    return null;
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(save));
  } catch (_e) {
    // storage full or blocked: the session just does not persist
  }
}

export function freshSave() {
  return { cash: 0, jobsDone: 0, bestGetaway: '', rep: {} };
}
