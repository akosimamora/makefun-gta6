// SOLMARA — shared constants for the whole game. One place for every
// number the other modules need, so tuning stays in one file.
export const WORLD = { w: 3200, h: 2400 };

export const DISTRICTS = [
  { id: 'palmera', name: 'Palmera Heights', x: 0, y: 0, w: 1280, h: 960, color: '#2e7d6b', accent: '#7fe0c3' },
  { id: 'marina', name: 'Marina', x: 1920, y: 0, w: 1280, h: 960, color: '#1f6f8b', accent: '#7fd4f0' },
  { id: 'downtown', name: 'Downtown', x: 640, y: 960, w: 1920, h: 480, color: '#5b4a8a', accent: '#c9b8ff' },
  { id: 'golden', name: 'Golden Palm', x: 0, y: 1440, w: 1280, h: 960, color: '#8a6d1f', accent: '#ffd94d' },
  { id: 'docks', name: 'Docks', x: 1920, y: 1440, w: 1280, h: 960, color: '#6b3a2e', accent: '#ff9d7a' },
];

export const ROAD_W = 96;
export const BLOCK = 320;

// Roads: verticals and horizontals that carve the city into blocks.
export const ROADS_X = [320, 640, 960, 1280, 1600, 1920, 2240, 2560, 2880];
export const ROADS_Y = [240, 480, 720, 960, 1200, 1440, 1680, 1920, 2160];

export const PLAYER = {
  walkSpeed: 260,
  radius: 14,
  maxHp: 100,
  pistolAmmo: 12,
  pistolDamage: 34,
  pistolRange: 420,
};

export const CAR = {
  accel: 520,
  brake: 900,
  maxSpeed: 620,
  maxReverse: 220,
  turnRate: 2.6,
  maxHp: 100,
};

export const TRAFFIC_COUNT = 22;
export const PED_COUNT = 28;

export const WANTED = {
  stealCar: 1,
  shoot: 1,
  max: 5,
  decayMs: 14000,
};

export const MISSION_COUNT = 4;

export const COLORS = {
  asphalt: '#23262e',
  roadLine: '#c8b45a',
  sidewalk: '#3a3e48',
  grass: '#1d3325',
  water: '#0f3a52',
  sand: '#8a7a4d',
  building: '#4a4f5e',
  buildingRoof: '#5d6374',
  player: '#e33f3f',
  police: '#2f6fe0',
  heli: '#d8d8d8',
  ped: '#d8c9a3',
  traffic: '#c9c9c9',
};

export const SAVE_KEY = 'solmara-save-v1';
