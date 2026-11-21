// Best-run records kept in localStorage so progress survives a reload.
import { SAVE_KEY } from './config.js';

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { bestCash: 0, jobsDone: 0 };
    const data = JSON.parse(raw);
    return { bestCash: data.bestCash | 0, jobsDone: data.jobsDone | 0 };
  } catch (e) {
    return { bestCash: 0, jobsDone: 0 };
  }
}

export function storeSave(save) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ bestCash: save.bestCash, jobsDone: save.jobsDone }));
  } catch (e) { /* storage unavailable: play without saving */ }
}
