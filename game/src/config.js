// Solmara tuning: every number the game balances on lives here.
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const TILE = 200;

export const WALK_SPEED = 260;
export const CAR_ACCEL = 900;
export const CAR_TOP_SPEED = 560;
export const CAR_BRAKE = 1400;
export const CAR_TURN = 3.1;

export const TRAFFIC_CARS = 22;
export const PEDESTRIANS = 28;
export const MAX_WANTED = 5;
export const PISTOL_AMMO = 12;
export const PLAYER_HP = 100;
export const RELOAD_MS = 900;
export const SHOT_COOLDOWN_MS = 220;

export const DISTRICTS = [
  { id: 'palmera', name: 'Palmera Heights', x: 0, y: 0, w: 1100, h: 900, ground: '#c9a86a', accent: '#8a6d3b' },
  { id: 'downtown', name: 'Downtown Sol', x: 1100, y: 0, w: 1100, h: 900, ground: '#7d8894', accent: '#3f5a78' },
  { id: 'harbor', name: 'Harbor District', x: 2200, y: 0, w: 1000, h: 900, ground: '#5d7d8a', accent: '#2e4a56' },
  { id: 'golden', name: 'Golden Palm', x: 0, y: 900, w: 1600, h: 800, ground: '#a8b06a', accent: '#6d7a2e' },
  { id: 'marina', name: 'Marina Bay', x: 1600, y: 900, w: 1600, h: 1500, ground: '#6a8a9e', accent: '#33566b' },
];

export const MISSION_LIST = [
  { id: 'courier', name: 'The Courier', payout: 1200, blurb: 'Pick up the package at the harbor and bring it to Palmera Heights.' },
  { id: 'golden', name: 'The Golden Palm', payout: 2800, blurb: 'Lift the ledger from the Golden Palm vault. Stay quiet.' },
  { id: 'getaway', name: 'The Getaway', payout: 4500, blurb: 'Lose a three-star tail, then reach the Marina Bay safehouse.' },
  { id: 'bigone', name: 'The Big One', payout: 9000, blurb: 'Hit the Sol Tower vault and get out of Downtown alive.' },
];

export const RANKS = ['CLEAN', 'MESSY', 'CHAOS'];
export const SAVE_KEY = 'solmara-save-v1';
export const SEED = 20261121;
