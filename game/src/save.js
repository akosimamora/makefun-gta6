// Best cash + jobs done, kept in localStorage between sessions.
window.SOL = window.SOL || {};
SOL.save = {
  key: 'solmara-save-v1',
  load() {
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return { bestCash: 0, jobsDone: 0 };
      const d = JSON.parse(raw);
      return { bestCash: d.bestCash | 0, jobsDone: d.jobsDone | 0 };
    } catch (e) { return { bestCash: 0, jobsDone: 0 }; }
  },
  store(bestCash, jobsDone) {
    try { window.localStorage.setItem(this.key, JSON.stringify({ bestCash, jobsDone })); } catch (e) { /* private mode */ }
  },
};
