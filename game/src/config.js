// Solmara tuning: world, roads, districts, physics, wanted, combat.
// One place for every number the game uses; the other files read, never invent.

export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD_STEP = 400;
export const ROAD_W = 56;
export const SEED = 20261121;

// Road centrelines. The bay sits west of x=200; the street grid starts there.
export const ROAD_XS = [200, 600, 1000, 1400, 1800, 2200, 2600, 3000];
export const ROAD_YS = [200, 600, 1000, 1400, 1800, 2200];

// Five districts. x1/y1 are exclusive bounds; districtAt takes the first match.
export const DISTRICTS = [
  {
    id: 'marina', name: 'Marina del Sol', x0: 0, y0: 0, x1: 800, y1: 1200,
    ground: '#79b3a4', groundAlt: '#86bfae',
    buildings: ['#e9d9b4', '#dcc9a2', '#f2e4c4', '#cfe0e8'],
    accent: '#2e8f86',
  },
  {
    id: 'palmera', name: 'Palmera Heights', x0: 800, y0: 0, x1: 2000, y1: 1200,
    ground: '#d9d3c3', groundAlt: '#e2dccb',
    buildings: ['#f2f0ea', '#dfe8f0', '#cfd6dd', '#e8e2d2'],
    accent: '#7a9a6a',
  },
  {
    id: 'neon', name: 'Neon Mile', x0: 2000, y0: 0, x1: 3200, y1: 1200,
    ground: '#8b7ed6', groundAlt: '#9789dd',
    buildings: ['#ff7fa5', '#b07fe8', '#ffab5e', '#e86a9a'],
    accent: '#ff4d8d',
  },
  {
    id: 'calle', name: 'Calle Sol', x0: 0, y0: 1200, x1: 1600, y1: 2400,
    ground: '#d6b475', groundAlt: '#dfc083',
    buildings: ['#f2c14e', '#e8863a', '#d95f4b', '#f7dc8a'],
    accent: '#c96a2e',
  },
  {
    id: 'dockside', name: 'Dockside', x0: 1600, y0: 1200, x1: 3200, y1: 2400,
    ground: '#9b9b90', groundAlt: '#a6a69b',
    buildings: ['#8a8f96', '#6f7a86', '#a89a80', '#5f6a72'],
    accent: '#5a7a8a',
  },
];

// The bay (water) and the sand strip along the west edge.
export const WATER = { x0: 0, x1: 140 };
export const BEACH = { x0: 140, x1: 200 };

// Named landmarks, placed on block centres (never on a road line).
export const LANDMARKS = [
  { name: 'Sol Tower', x: 1600, y: 400, w: 190, h: 150, color: '#bcd8ea', district: 'palmera' },
  { name: 'Golden Palm', x: 2400, y: 800, w: 230, h: 170, color: '#ff7fa5', district: 'neon' },
  { name: 'Dockside Warehouse', x: 2400, y: 1600, w: 210, h: 150, color: '#7a8288', district: 'dockside' },
  { name: 'Safehouse', x: 800, y: 2000, w: 100, h: 90, color: '#e8b04a', district: 'calle' },
];

// Places the missions point at.
export const PLACES = {
  marinaPickup: { x: 400, y: 1000 },
  packagePickup: { x: 1000, y: 1600 },
  goldenPalm: { x: 2400, y: 800 },
  dockside: { x: 2400, y: 1600 },
  safehouse: { x: 800, y: 2000 },
};

// Mara on foot, and her pistol.
export const PLAYER = {
  walk: 175, run: 265, radius: 13, hp: 100,
  ammoMax: 12, reloadDelay: 1.4, gunRange: 540,
};

// Any car: physics, size, health.
export const CAR = {
  accel: 350, brake: 540, reverseAccel: 210,
  maxSpeed: 335, maxReverse: 125, turn: 2.7, radius: 17, hp: 100,
};

export const TRAFFIC_COUNT = 22;
export const TRAFFIC_SPEED = 96;
export const PED_COUNT = 28;
export const COP_FOOT_SPEED = 178;
export const COP_BUST_DIST = 30;
export const POLICE_CAR_SPEED = 305;
export const HELI_SPEED = 270;
export const WANTED_COOL = 9; // quiet seconds to lose one star
export const KMH = 0.45; // world units per second -> km/h on the HUD

export const CAR_COLORS = ['#d84a4a', '#4a7ad8', '#e8c33a', '#5ab05a', '#e8e8e8', '#3a3a3a', '#d87a2e', '#8a5ad8'];
export const PED_COLORS = ['#3a7a4a', '#7a3a5a', '#2e6a8a', '#8a6a2e', '#5a5a5a', '#a03a3a'];
