// SOLMARA — world constants. One source of truth for sizes, speeds,
// districts and colours so every system (world, render, missions) agrees.
export const WORLD_W = 3200;
export const WORLD_H = 2400;

export const ROAD_W = 96;
export const ROAD_X = [400, 1000, 1600, 2200, 2800];
export const ROAD_Y = [400, 900, 1400, 1900];

// Five districts, one per corner plus the old centre. A district's REP
// turns gold on the minimap once the player finishes a job there.
export const DISTRICTS = [
  { id: 'palmera', name: 'Palmera Heights', x: 0,    y: 0,    w: 1500, h: 1100, color: '#2e7d6b' },
  { id: 'marina',  name: 'Marina',          x: 1700, y: 0,    w: 1500, h: 1100, color: '#2b6cb0' },
  { id: 'oldtown', name: 'Old Town',        x: 1000, y: 1150, w: 1200, h: 700,  color: '#8a6d3b' },
  { id: 'palm',    name: 'Golden Palm',     x: 0,    y: 1500, w: 1500, h: 900,  color: '#b7791f' },
  { id: 'docks',   name: 'Docks',           x: 1700, y: 1500, w: 1500, h: 900,  color: '#4a5568' },
];

// Landmark buildings, placed by city.js on fixed plots.
export const LANDMARKS = [
  { name: 'Sol Tower',      district: 'palmera', w: 220, h: 160 },
  { name: 'Marina Pier',    district: 'marina',  w: 260, h: 120 },
  { name: 'City Hall',      district: 'oldtown', w: 200, h: 140 },
  { name: 'Golden Palm',    district: 'palm',    w: 260, h: 180 },
  { name: 'Dock 9',         district: 'docks',   w: 240, h: 150 },
];

// Movement + combat tuning.
export const FOOT_SPEED = 230;          // px/s on foot
export const CAR_ACCEL = 520;           // px/s^2
export const CAR_MAX_SPEED = 620;       // px/s (~150 km/h on the HUD)
export const CAR_BRAKE = 900;
export const CAR_TURN = 3.1;            // rad/s at full lock
export const TRAFFIC_SPEED = 150;       // px/s cruise
export const PED_SPEED = 55;            // px/s
export const PISTOL_AMMO = 12;
export const PISTOL_RANGE = 420;
export const PISTOL_DAMAGE = 34;
export const PLAYER_HP = 100;
export const CAR_HP = 100;
export const COP_FOOT_SPEED = 200;
export const COP_CAR_SPEED = 560;
export const HELI_SPEED = 300;

// Wanted: heat 0..100 per star is simpler than a raw star counter;
// stars shown are ceil(heat / 20), capped at 5.
export const WANTED_PER_STAR = 20;
export const WANTED_MAX = 100;
export const WANTED_DECAY_PER_S = 2.2;  // heat lost while unseen
export const STEAL_HEAT = 22;           // stealing a car
export const SHOOT_HEAT = 14;           // firing near witnesses
export const KILL_HEAT = 30;

export const COLORS = {
  grass: '#1d4a2f',
  road: '#2d2d33',
  roadLine: '#e8c547',
  sidewalk: '#3a3f47',
  building: '#4b5563',
  buildingRoof: '#5b6773',
  water: '#1e5f8a',
  player: '#e53e3e',
  cop: '#2b6cb0',
  heli: '#1a202c',
  ped: '#f6e05e',
  traffic: '#a0aec0',
};
