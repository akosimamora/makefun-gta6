// Solmara: the city, the tuning and the keys. One place for every number the
// game balances on, so a tweak never means hunting through the world code.
// The city is a sun-soaked coastal town of five districts, 3200 by 2400 units,
// drawn top-down on a canvas. Roads run on a 400-unit grid; the west edge is
// the bay. Everything here is original: no names, maps or art from any
// commercial game.

export const WORLD_W = 3200;
export const WORLD_H = 2400;

// --- the road grid -------------------------------------------------------
export const ROAD_STEP = 400; // roads every 400 units
export const ROAD_W = 72; // asphalt plus sidewalks
export const ROAD_ASPHALT = 48;
export const FIRST_ROAD_X = 400;
export const FIRST_ROAD_Y = 400;

// --- districts: name, bounds, palette, starting standing -----------------
// A district's standing (rep) grows as Mara finishes jobs there; the minimap
// tints a district from grey toward gold as its standing rises.
export const DISTRICTS = [
  {
    id: 'marina',
    name: 'Marina del Sol',
    x: 0, y: 0, w: 800, h: 2400,
    road: '#8a7a5c', roof: ['#e8b48a', '#d99a6c', '#c98a7a'],
    accent: '#2e7f9e', rep: 0,
  },
  {
    id: 'heights',
    name: 'Palmera Heights',
    x: 800, y: 0, w: 1200, h: 1200,
    road: '#7a7a72', roof: ['#b8c4cc', '#9fb2c0', '#d8d2c4'],
    accent: '#c98a2e', rep: 0,
  },
  {
    id: 'neon',
    name: 'Neon Mile',
    x: 800, y: 1200, w: 1200, h: 1200,
    road: '#5c4a6e', roof: ['#e06a9e', '#7a5cc9', '#e8a83e'],
    accent: '#e83e8a', rep: 0,
  },
  {
    id: 'calle',
    name: 'Calle Sol',
    x: 2000, y: 0, w: 1200, h: 1200,
    road: '#8a7a5c', roof: ['#e8c98a', '#d9a86c', '#c9b48a'],
    accent: '#e07a2e', rep: 0,
  },
  {
    id: 'docks',
    name: 'Dockside',
    x: 2000, y: 1200, w: 1200, h: 1200,
    road: '#6e6e66', roof: ['#8a8a82', '#a89a7a', '#7a7a72'],
    accent: '#5c8a2e', rep: 0,
  },
];

// --- the bay and the beach ------------------------------------------------
export const BAY_X = 0; // water west of this line
export const BAY_W = 320;
export const BEACH_W = 64; // sand between the water and the first road

// --- the player ------------------------------------------------------------
export const PLAYER = {
  radius: 13,
  walkSpeed: 170, // units per second
  runSpeed: 285,
  health: 100,
  pistolDamage: 34,
  pistolRange: 420,
  pistolCooldown: 0.28,
  ammoMax: 12,
  ammoRefill: 12,
};

// --- cars ------------------------------------------------------------------
export const CAR = {
  width: 30,
  length: 58,
  accel: 420, // units per second squared
  brake: 700,
  reverseAccel: 260,
  maxSpeed: 520,
  maxReverse: 160,
  turnRate: 2.6, // radians per second at full lock, scaled by speed
  grip: 0.92, // how much of the velocity follows the heading
  health: 100,
  trafficSpeed: 150,
  trafficCount: 26,
};

// --- pedestrians -----------------------------------------------------------
export const PED = {
  radius: 11,
  walkSpeed: 62,
  fleeSpeed: 150,
  count: 30,
};

// --- the police and the wanted level ---------------------------------------
// Stars 0-5. Each star adds pursuit cars and shortens the time a crime is
// forgotten. At 3 stars a helicopter joins with a searchlight.
export const WANTED = {
  maxStars: 5,
  decayDelay: 6, // seconds clean before the stars start to fall
  decayRate: 0.25, // stars per second once cooling down
  carsPerStar: [0, 1, 2, 3, 4, 5],
  footPerStar: [0, 1, 1, 2, 2, 3],
  heliAtStars: 3,
  bustRadius: 26, // a cop this close on foot busts Mara
  ramDamage: 14,
};

// --- missions --------------------------------------------------------------
export const MISSION_CASH = [800, 1400, 2200, 5000];
export const REP_PER_MISSION = [20, 25, 30, 40];

// --- the camera and the view -----------------------------------------------
export const CAMERA = {
  lerp: 6.5, // how fast the camera catches the player, per second
  zoomFoot: 1.0,
  zoomCar: 0.82, // pull back a little when driving fast
  shakeDecay: 8,
};

// --- persistence -----------------------------------------------------------
export const SAVE_KEY = 'solmara-save-v1';
export const BEST_KEY = 'solmara-best-v1';

// --- keys ------------------------------------------------------------------
export const KEY = {
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  run: ['ShiftLeft', 'ShiftRight'],
  enter: ['KeyE'],
  brake: ['Space'],
  pause: ['KeyP', 'Escape'],
  confirm: ['Enter', 'Space'],
  mute: ['KeyM'],
};
