// The city of Solmara: districts, a road grid, buildings and landmarks.
import { WORLD_W, WORLD_H, DISTRICTS, TILE } from './config.js';

export function buildCity(rng) {
  const roads = [];
  for (let x = TILE; x < WORLD_W; x += TILE) roads.push({ x, y: 0, w: 34, h: WORLD_H, vertical: true });
  for (let y = TILE; y < WORLD_H; y += TILE) roads.push({ x: 0, y, w: WORLD_W, h: 34, vertical: false });

  const buildings = [];
  const palette = ['#b08d57', '#8a7f8d', '#6b7d8a', '#a87f6b', '#7d8a6b', '#93706b'];
  for (const d of DISTRICTS) {
    const count = d.id === 'downtown' ? 26 : 16;
    for (let i = 0; i < count; i++) {
      const bw = rng.range(70, 150);
      const bh = rng.range(60, 130);
      const bx = rng.range(d.x + 60, d.x + d.w - 60 - bw);
      const by = rng.range(d.y + 60, d.y + d.h - 60 - bh);
      if (onRoad(bx, by, bw, bh)) continue;
      buildings.push({ x: bx, y: by, w: bw, h: bh, color: rng.pick(palette), tall: d.id === 'downtown' && rng.chance(0.5) });
    }
  }

  const landmarks = [
    { id: 'soltower', name: 'Sol Tower', x: 1500, y: 420, w: 120, h: 120, color: '#2e4a66' },
    { id: 'vault', name: 'Golden Palm Vault', x: 700, y: 1250, w: 110, h: 90, color: '#8a6d1f' },
    { id: 'safehouse', name: 'Marina Safehouse', x: 2400, y: 1900, w: 100, h: 80, color: '#2e6b4a' },
    { id: 'harbor', name: 'Harbor Pier', x: 2800, y: 300, w: 140, h: 60, color: '#4a5a6b' },
    { id: 'beach', name: 'Palmera Beach', x: 120, y: 700, w: 220, h: 60, color: '#e8d8a8' },
  ];

  return { districts: DISTRICTS, roads, buildings, landmarks, w: WORLD_W, h: WORLD_H };
}

function onRoad(x, y, w, h) {
  for (let gx = TILE; gx < WORLD_W; gx += TILE) {
    if (x < gx + 34 && x + w > gx) return true;
  }
  for (let gy = TILE; gy < WORLD_H; gy += TILE) {
    if (y < gy + 34 && y + h > gy) return true;
  }
  return false;
}

export function districtAt(city, x, y) {
  for (const d of city.districts) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return city.districts[0];
}

export function nearestRoadY(y) {
  return Math.round(y / TILE) * TILE + 17;
}

export function nearestRoadX(x) {
  return Math.round(x / TILE) * TILE + 17;
}
