// Solmara layout: a coastal grid city — beach and water on the west edge,
// five districts, avenues every 320px, buildings filling the blocks.
import { CONFIG } from './config.js';
import { mulberry32, intRange, pick } from './random.js';

export function buildCity() {
  const rng = mulberry32(20261121);
  const roads = [];
  for (let x = 320; x < CONFIG.worldW; x += 320) roads.push({ x1: x, y1: 0, x2: x, y2: CONFIG.worldH, vertical: true });
  for (let y = 320; y < CONFIG.worldH; y += 320) roads.push({ x1: 0, y1: y, x2: CONFIG.worldW, y2: y, vertical: false });
  const buildings = [];
  const palette = ['#5a4a3a', '#6b5a44', '#4a5568', '#715a3a', '#54423a', '#3f4a5a'];
  for (let bx = 0; bx < 10; bx++) {
    for (let by = 0; by < 7; by++) {
      if (bx === 0) continue; // beach strip, no buildings
      const n = intRange(rng, 1, 3);
      for (let i = 0; i < n; i++) {
        const w = intRange(rng, 90, 180);
        const h = intRange(rng, 90, 180);
        const x = bx * 320 + 40 + intRange(rng, 0, Math.max(0, 320 - w - 80));
        const y = by * 320 + 40 + intRange(rng, 0, Math.max(0, 320 - h - 80));
        buildings.push({ x, y, w, h, color: pick(rng, palette), roof: rng() < 0.3 });
      }
    }
  }
  // Landmarks: Sol Tower at the plaza, the Golden Palm casino, the marina pier.
  buildings.push({ x: 1960, y: 1380, w: 220, h: 220, color: '#2c3e6b', roof: true, landmark: 'Sol Tower' });
  buildings.push({ x: 2560, y: 300, w: 260, h: 160, color: '#8a6d1f', roof: true, landmark: 'Golden Palm' });
  buildings.push({ x: 1500, y: 420, w: 200, h: 120, color: '#1f6b5e', roof: false, landmark: 'Marina' });
  return {
    roads,
    buildings,
    beach: { x: 0, y: 0, w: 200, h: CONFIG.worldH },
    water: { x: 0, y: 0, w: 90, h: CONFIG.worldH },
    plaza: { x: 1900, y: 1320, w: 340, h: 340 },
    spawn: { x: 600, y: 900 },
    carSpawns: [
      { x: 700, y: 1027 }, { x: 830, y: 1027 }, { x: 1020, y: 1347 },
      { x: 1500, y: 700 }, { x: 2100, y: 1667 }, { x: 2600, y: 1027 },
      { x: 1100, y: 1987 }, { x: 2400, y: 1987 },
    ],
  };
}

export function districtAt(x, y) {
  for (const d of CONFIG.districts) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return CONFIG.districts[0];
}

export function onRoad(city, x, y) {
  for (const r of city.roads) {
    if (r.vertical && Math.abs(x - r.x1) < 46) return true;
    if (!r.vertical && Math.abs(y - r.y1) < 46) return true;
  }
  return false;
}
