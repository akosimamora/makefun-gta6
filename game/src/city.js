// The city itself: roads, blocks, buildings and landmarks. Buildings are
// placed at block centres and never overlap a road, so cars always have a
// clear lane (an earlier build put City Hall across a road and the cover
// shot's car was wrecked on it).
import { WORLD, DISTRICTS, ROAD_W, BLOCK, ROADS_X, ROADS_Y } from './config.js';
import { makeRng, range as rngRange, rangeInt as rngInt } from './random.js';

function onRoad(x, y) {
  const half = ROAD_W / 2 + 8;
  for (const rx of ROADS_X) if (Math.abs(x - rx) < half) return true;
  for (const ry of ROADS_Y) if (Math.abs(y - ry) < half) return true;
  return false;
}

function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[2];
}

export function buildCity(seed = 1337) {
  const rng = makeRng(seed);
  const buildings = [];
  // Walk the block grid; one building per block centre, jittered inside
  // the block so it never touches a road.
  for (let bx = 0; bx < WORLD.w / BLOCK; bx++) {
    for (let by = 0; by < WORLD.h / BLOCK; by++) {
      const cx = bx * BLOCK + BLOCK / 2;
      const cy = by * BLOCK + BLOCK / 2;
      if (onRoad(cx, cy)) continue;
      if (rng() < 0.12) continue; // a few empty lots / parks
      const w = rngRange(rng, 110, 190);
      const h = rngRange(rng, 90, 170);
      const d = districtAt(cx, cy);
      buildings.push({
        x: cx - w / 2, y: cy - h / 2, w, h,
        district: d.id,
        hue: d.color,
        tall: rng() < 0.18,
      });
    }
  }
  // Landmarks sit in the middle of their own block, clear of any road.
  const landmarks = [
    { id: 'soltower', name: 'Sol Tower', x: 1600, y: 1200, w: 150, h: 150, color: '#8a7bd8' },
    { id: 'goldenpalm', name: 'Golden Palm', x: 640, y: 1920, w: 220, h: 140, color: '#e0b62e' },
    { id: 'cityhall', name: 'City Hall', x: 800, y: 800, w: 180, h: 120, color: '#7fb069' },
    { id: 'marina', name: 'Marina Pier', x: 2720, y: 480, w: 200, h: 110, color: '#4db2d8' },
    { id: 'docks', name: 'Dock Crane', x: 2560, y: 1920, w: 170, h: 130, color: '#d87a4d' },
  ];
  return { buildings, landmarks, districtAt };
}

export function pointInBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  for (const l of city.landmarks) {
    if (x > l.x - l.w / 2 - pad && x < l.x + l.w / 2 + pad && y > l.y - l.h / 2 - pad && y < l.y + l.h / 2 + pad) return l;
  }
  return null;
}

export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROADS_X) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, vertical: true }; }
  }
  for (const ry of ROADS_Y) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, vertical: false }; }
  }
  return best;
}
