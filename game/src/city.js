// Solmara itself: districts, buildings, trees, lamps, boats, and the helpers
// the simulation uses to ask where things are (roads, collisions, spawning).

import {
  WORLD_W, WORLD_H, ROAD_W, ROAD_XS, ROAD_YS,
  DISTRICTS, LANDMARKS, SEED,
} from './config.js';
import { createRng } from './random.js';

/** The district a point stands in (first match wins; the rects tile the map). */
export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[0];
}

/** Whether a point is on a road (within half the road width of a centreline). */
export function isOnRoad(x, y) {
  for (const rx of ROAD_XS) if (Math.abs(x - rx) < ROAD_W / 2) return true;
  for (const ry of ROAD_YS) if (Math.abs(y - ry) < ROAD_W / 2) return true;
  return false;
}

/** The building a circle touches, or null. Buildings are {x, y, w, h} rects. */
export function hitsBuilding(city, x, y, r) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < r * r) return b;
  }
  return null;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function buildableRect(x0, x1, y0, y1) {
  const isRoadX = (v) => ROAD_XS.includes(v);
  const isRoadY = (v) => ROAD_YS.includes(v);
  const bx0 = isRoadX(x0) ? x0 + ROAD_W / 2 + 8 : x0 + 8;
  const bx1 = isRoadX(x1) ? x1 - ROAD_W / 2 - 8 : x1 - 8;
  const by0 = isRoadY(y0) ? y0 + ROAD_W / 2 + 8 : y0 + 8;
  const by1 = isRoadY(y1) ? y1 - ROAD_W / 2 - 8 : y1 - 8;
  return { x0: bx0, x1: bx1, y0: by0, y1: by1 };
}

/** Build the whole city from the seed. Same seed, same Solmara. */
export function buildCity(seed) {
  const rng = createRng(seed);
  const buildings = [];

  // Landmarks first, at their fixed spots.
  for (const lm of LANDMARKS) {
    buildings.push({
      x: lm.x - lm.w / 2, y: lm.y - lm.h / 2, w: lm.w, h: lm.h,
      color: lm.color, name: lm.name, district: lm.district,
    });
  }

  // One (sometimes two) buildings per block, never on a road, never on a landmark.
  const xs = [0, ...ROAD_XS, WORLD_W];
  const ys = [0, ...ROAD_YS, WORLD_H];
  for (let i = 0; i < xs.length - 1; i++) {
    for (let j = 0; j < ys.length - 1; j++) {
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const y0 = ys[j];
      const y1 = ys[j + 1];
      if (x1 <= 200) continue; // the water and beach strip, no buildings
      const rect = buildableRect(x0, x1, y0, y1);
      const rw = rect.x1 - rect.x0;
      const rh = rect.y1 - rect.y0;
      if (rw < 70 || rh < 70) continue;
      const tries = rng.chance(0.35) ? 2 : 1;
      for (let t = 0; t < tries; t++) {
        const w = rng.range(60, Math.min(150, rw));
        const h = rng.range(60, Math.min(150, rh));
        const bx = rng.range(rect.x0, rect.x1 - w);
        const by = rng.range(rect.y0, rect.y1 - h);
        const b = { x: bx, y: by, w, h, color: '', name: null, district: '' };
        const cx = bx + w / 2;
        const cy = by + h / 2;
        const d = districtAt(cx, cy);
        b.district = d.id;
        b.color = rng.pick(d.buildings);
        let blocked = false;
        for (const other of buildings) {
          if (rectsOverlap(b, other)) { blocked = true; break; }
        }
        if (!blocked) buildings.push(b);
      }
    }
  }

  // Trees: on sidewalks and in blocks, never on a road or inside a building.
  const trees = [];
  for (let i = 0; i < 90; i++) {
    const x = rng.range(220, WORLD_W - 20);
    const y = rng.range(20, WORLD_H - 20);
    if (isOnRoad(x, y)) continue;
    if (hitsBuilding({ buildings }, x, y, 16)) continue;
    trees.push({ x, y, r: rng.range(8, 14), color: rng.pick(['#3f7a3a', '#4a8a42', '#35702f', '#5a9a4a']) });
  }

  // Lamps: one at the north-east corner of every intersection.
  const lamps = [];
  for (const rx of ROAD_XS) {
    for (const ry of ROAD_YS) {
      lamps.push({ x: rx + ROAD_W / 2 + 6, y: ry - ROAD_W / 2 - 6 });
    }
  }

  // Boats bobbing in the bay, west of the beach.
  const boats = [];
  for (let i = 0; i < 7; i++) {
    boats.push({
      x: rng.range(35, 115), y: rng.range(150, WORLD_H - 150),
      angle: rng.range(-0.4, 0.4), len: rng.range(34, 52),
      color: rng.pick(['#e8e8e8', '#d84a4a', '#4a7ad8', '#e8c33a']),
    });
  }

  return { buildings, trees, lamps, boats };
}

/** A random point on a road centreline, with a lane offset (right-hand side). */
export function randomRoadPoint(rng) {
  if (rng.chance(0.5)) {
    const x = rng.pick(ROAD_XS);
    const y = rng.range(220, WORLD_H - 20);
    return { x: x + 14, y, angle: rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2 };
  }
  const y = rng.pick(ROAD_YS);
  const x = rng.range(220, WORLD_W - 20);
  return { x, y: y + 14, angle: rng.chance(0.5) ? 0 : Math.PI };
}

/** The nearest point on a road centreline to (x, y), with its direction. */
export function nearestRoadPoint(x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of ROAD_XS) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y, angle: y < WORLD_H / 2 ? Math.PI / 2 : -Math.PI / 2 }; }
  }
  for (const ry of ROAD_YS) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry, angle: x < WORLD_W / 2 ? 0 : Math.PI }; }
  }
  return best;
}
