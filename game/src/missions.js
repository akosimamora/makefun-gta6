// The story: Mara Voss, wheelwoman for hire, takes four jobs from the fixer
// Elias Kross — each one hotter than the last, ending at the Golden Palm vault.
import { CONFIG } from './config.js';

export const MISSIONS = [
  {
    id: 'courier',
    title: 'The Courier',
    giver: 'Elias Kross',
    text: 'Drive the package to Marina Bay. No questions, no stops.',
    target: { x: 1560, y: 470, district: 'marina' },
    payout: CONFIG.missionPayouts[0],
    needsCar: true,
  },
  {
    id: 'dockside',
    title: 'Dockside Pickup',
    giver: 'Elias Kross',
    text: 'A crate at Dockside is waiting. Grab it on foot, then vanish.',
    target: { x: 640, y: 1900, district: 'dock' },
    payout: CONFIG.missionPayouts[1],
    needsCar: false,
  },
  {
    id: 'tail',
    title: 'The Tail',
    giver: 'Mara Voss',
    text: 'Kross sent a tail. Lose the cops at Sol Tower, then come home.',
    target: { x: 2070, y: 1490, district: 'sol' },
    payout: CONFIG.missionPayouts[2],
    needsCar: true,
  },
  {
    id: 'bigone',
    title: 'The Big One',
    giver: 'Elias Kross',
    text: 'The Golden Palm vault. In, out, and gone before the heli arrives.',
    target: { x: 2690, y: 380, district: 'golden' },
    payout: CONFIG.missionPayouts[3],
    needsCar: false,
  },
];

export function missionFor(index) {
  return MISSIONS[Math.min(index, MISSIONS.length - 1)];
}

export function rateGetaway(wantedPeak, tookDamage) {
  if (wantedPeak <= 1 && !tookDamage) return 'CLEAN';
  if (wantedPeak <= 3) return 'MESSY';
  return 'CHAOS';
}
