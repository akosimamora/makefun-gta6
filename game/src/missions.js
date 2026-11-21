// Mara Voss vs fixer Elias Kross: four chained jobs across Solmara.
import { MISSION_LIST } from './config.js';

export function createMissions() {
  const targets = [
    { x: 2800, y: 300, label: 'Harbor Pier' },
    { x: 700, y: 1250, label: 'Golden Palm Vault' },
    { x: 2400, y: 1900, label: 'Marina Safehouse' },
    { x: 1500, y: 420, label: 'Sol Tower Vault' },
  ];
  let index = 0;
  let done = 0;
  let cash = 0;

  return {
    current() {
      if (index >= MISSION_LIST.length) return null;
      return { ...MISSION_LIST[index], target: targets[index], num: index + 1, total: MISSION_LIST.length };
    },
    isFinished() { return index >= MISSION_LIST.length; },
    jobsDone() { return done; },
    cashEarned() { return cash; },
    checkArrival(px, py) {
      const m = this.current();
      if (!m) return null;
      const dx = px - m.target.x;
      const dy = py - m.target.y;
      if (dx * dx + dy * dy < 90 * 90) {
        cash += m.payout;
        done += 1;
        index += 1;
        return m;
      }
      return null;
    },
    reset() { index = 0; done = 0; cash = 0; },
  };
}

export function getawayRank(wantedPeaks, shotsFired) {
  if (wantedPeaks <= 1 && shotsFired <= 2) return 'CLEAN';
  if (wantedPeaks <= 3) return 'MESSY';
  return 'CHAOS';
}
