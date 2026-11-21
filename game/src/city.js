// The city of Solmara, generated from a seed: five districts on a road grid,
// a bay on the west edge, buildings, landmarks and the places missions use.
// Everything is data (rects and lists) so the world, the renderer and the
// minimap all read the same city, and the same seed builds the same city.

import {
  BAY_W, BEACH_W, DISTRICTS, FIRST_ROAD_X, FIRST_ROAD_Y,
  ROAD_ASPHALT, ROAD_STEP, ROAD_W, WORLD_H, WORLD_W,
} from './config.js';

const PALM = '#3f8a4e';
const LAMP = '#f2c94c';

// The roads, as center lines: vertical at x, horizontal at y.
export function roadLines() {
  const vertical = [];
  const horizontal = [];
  for (let x = FIRST_ROAD_X; x < WORLD_W; x += ROAD_STEP) vertical.push(x);
  for (let y = FIRST_ROAD_Y; y < WORLD_H; y += ROAD_STEP) horizontal.push(y);
  return { vertical, horizontal };
}

// Which district holds a point (the marina's water counts as the marina).
export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

// Is a point on a road (asphalt, not sidewalk)?
export function onRoad(x, y) {
  const { vertical, horizontal } = roadLines();
  const half = ROAD_ASPHALT / 2;
  for (const rx of vertical) if (Math.abs(x - rx) <= half) return true;
  for (const ry of horizontal) if (Math.abs(y - ry) <= half) return true;
  return false;
}

// Is a point on a sidewalk (the road's edge band)?
export function onSidewalk(x, y) {
  const { vertical, horizontal } = roadLines();
  const half = ROAD_W / 2;
  const inner = ROAD_ASPHALT / 2;
  for (const rx of vertical) {
    const d = Math.abs(x - rx);
    if (d > inner && d <= half) return true;
  }
  for (const ry of horizontal) {
    const d = Math.abs(y - ry);
    if (d > inner && d <= half) return true;
  }
  return false;
}

// Build the whole city from a seed.
export function createCity(rng) {
  const { vertical, horizontal } = roadLines();
  const buildings = [];
  const trees = [];
  const lamps = [];
  const boats = [];

  // Landmarks, fixed so missions always find them.
  const landmarks = {
    tower: { x: 1400, y: 600, w: 150, h: 150, name: 'Sol Tower', kind: 'tower' },
    casino: { x: 1400, y: 1800, w: 190, h: 130, name: 'Golden Palm', kind: 'casino' },
    warehouse: { x: 2600, y: 1800, w: 210, h: 120, name: 'Dockside Storage', kind: 'warehouse' },
    safehouse: { x: 2400, y: 600, w: 110, h: 90, name: "Mara's Safehouse", kind: 'safehouse' },
  };

  // Buildings, one block at a time. A block is the ground between two roads;
  // each block holds one to four buildings with a courtyard gap between them.
  const blocksX = [BAY_W + BEACH_W + ROAD_W / 2];
  for (let i = 0; i < vertical.length; i++) blocksX.push(vertical[i] + ROAD_W / 2);
  const blocksY = [ROAD_W / 2];
  for (let i = 0; i < horizontal.length; i++) blocksY.push(horizontal[i] + ROAD_W / 2);
  const blockEndsX = [...vertical.map((v) => v - ROAD_W / 2), WORLD_W];
  const blockEndsY = [...horizontal.map((h) => h - ROAD_W / 2), WORLD_H];

  for (let bx = 0; bx < blocksX.length; bx++) {
    for (let by = 0; by < blocksY.length; by++) {
      const x0 = blocksX[bx];
      const y0 = blocksY[by];
      const x1 = blockEndsX[bx];
      const y1 = blockEndsY[by];
      const w = x1 - x0;
      const h = y1 - y0;
      if (w < 60 || h < 60) continue;
      // The bay's first column is beach, not buildings.
      if (x0 < BAY_W + BEACH_W) continue;
      const district = districtAt((x0 + x1) / 2, (y0 + y1) / 2);
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i++) {
        const bw = rng.range(70, Math.max(80, w / count - 24));
        const bh = rng.range(60, Math.max(70, h - 24));
        const bx0 = x0 + rng.range(8, Math.max(9, w - bw - 8));
        const by0 = y0 + rng.range(8, Math.max(9, h - bh - 8));
        const kind = district.id === 'docks' && rng.chance(0.5) ? 'warehouse'
          : district.id === 'heights' && rng.chance(0.25) ? 'tower' : 'house';
        buildings.push({
          x: bx0, y: by0, w: bw, h: bh,
          color: rng.pick(district.roof),
          height: kind === 'tower' ? rng.int(3, 5) : rng.int(1, 2),
          kind,
          district: district.id,
        });
      }
      // A tree or two in the block's courtyard.
      if (rng.chance(0.7)) {
        trees.push({ x: x0 + rng.range(20, w - 20), y: y0 + rng.range(20, h - 20), r: rng.range(8, 13) });
      }
    }
  }

  // The landmarks replace whatever the block pass put near them.
  for (const lm of Object.values(landmarks)) {
    for (let i = buildings.length - 1; i >= 0; i--) {
      const b = buildings[i];
      if (b.x < lm.x + lm.w && b.x + b.w > lm.x && b.y < lm.y + lm.h && b.y + b.h > lm.y) {
        buildings.splice(i, 1);
      }
    }
    buildings.push({
      x: lm.x, y: lm.y, w: lm.w, h: lm.h,
      color: lm.kind === 'casino' ? '#e06a9e' : lm.kind === 'tower' ? '#b8c4cc' : lm.kind === 'warehouse' ? '#8a8a82' : '#e8c98a',
      height: lm.kind === 'tower' ? 6 : 2,
      kind: lm.kind, district: districtAt(lm.x + lm.w / 2, lm.y + lm.h / 2).id,
      name: lm.name,
    });
  }

  // Street lamps at every intersection, and palms along the beach.
  for (const rx of vertical) {
    for (const ry of horizontal) lamps.push({ x: rx + ROAD_W / 2 + 6, y: ry - ROAD_W / 2 - 6 });
  }
  for (let y = 80; y < WORLD_H; y += 130) {
    trees.push({ x: BAY_W + BEACH_W - 18, y, r: 12 });
  }

  // Boats in the bay, moored near the marina.
  for (let i = 0; i < 7; i++) {
    boats.push({ x: rng.range(60, BAY_W - 60), y: rng.range(120, WORLD_H - 120), angle: rng.range(-0.4, 0.4), len: rng.range(46, 78) });
  }

  // The places missions and the player start from.
  const spots = {
    safehouse: { x: 2400, y: 700 },
    garage: { x: 2520, y: 700 },
    marinaPickup: { x: 520, y: 1200 },
    neonCasino: { x: 1400, y: 1960 },
    dockDebt: { x: 2600, y: 1960 },
    heightsGetaway: { x: 1400, y: 760 },
    playerStart: { x: 2400, y: 720 },
  };

  return {
    buildings, trees, lamps, boats, landmarks, spots,
    vertical, horizontal,
  };
}

// True when a circle (x, y, radius) touches a building or the water.
// The beach is walkable; the bay itself is not.
export function hitsSolid(city, x, y, radius) {
  if (x - radius < BAY_W || x + radius > WORLD_W || y - radius < 0 || y + radius > WORLD_H) return true;
  for (const b of city.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
  }
  return false;
}

// Slide a circle out of buildings and the water, axis by axis, so movement
// along a wall still works. Returns the corrected position.
export function slideOut(city, x, y, radius) {
  let nx = x;
  let ny = y;
  if (nx - radius < BAY_W) nx = BAY_W + radius;
  if (nx + radius > WORLD_W) nx = WORLD_W - radius;
  if (ny - radius < 0) ny = radius;
  if (ny + radius > WORLD_H) ny = WORLD_H - radius;
  for (const b of city.buildings) {
    if (nx + radius > b.x && nx - radius < b.x + b.w && ny + radius > b.y && ny - radius < b.y + b.h) {
      const pushL = nx + radius - b.x;
      const pushR = b.x + b.w - (nx - radius);
      const pushT = ny + radius - b.y;
      const pushB = b.y + b.h - (ny - radius);
      const m = Math.min(pushL, pushR, pushT, pushB);
      if (m === pushL) nx = b.x - radius;
      else if (m === pushR) nx = b.x + b.w + radius;
      else if (m === pushT) ny = b.y - radius;
      else ny = b.y + b.h + radius;
    }
  }
  return { x: nx, y: ny };
}

// A point on a road nearest to (x, y), for spawning traffic and police.
export function nearestRoadPoint(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.vertical) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y }; }
  }
  for (const ry of city.horizontal) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry }; }
  }
  return best;
}

export { PALM, LAMP };
