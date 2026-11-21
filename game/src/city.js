// City generation: roads on a fixed grid, buildings filling the blocks
// between them, one named landmark per district. Deterministic for a
// given seed — the same seed always builds the same Solmara.
import { WORLD_W, WORLD_H, ROAD_W, ROAD_X, ROAD_Y, DISTRICTS, LANDMARKS } from './config.js';

function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[2];
}

function onRoad(x, y) {
  for (const rx of ROAD_X) if (Math.abs(x - rx) < ROAD_W / 2 + 8) return true;
  for (const ry of ROAD_Y) if (Math.abs(y - ry) < ROAD_W / 2 + 8) return true;
  return false;
}

// True when a building rectangle would touch a road (with a margin).
// The block fill uses this, not the centre point, so no building ever
// sticks out onto the driving surface.
function rectHitsRoad(x, y, w, h) {
  const m = ROAD_W / 2 + 12;
  for (const rx of ROAD_X) {
    if (x < rx + m && x + w > rx - m) return true;
  }
  for (const ry of ROAD_Y) {
    if (y < ry + m && y + h > ry - m) return true;
  }
  return false;
}

export function buildCity(rng) {
  const buildings = [];
  // One landmark per district, on a fixed plot in the middle of a
  // block — never on a road — so missions can point at it and cars
  // can drive past it.
  const landmarkPlots = {
    palmera: { x: 700, y: 650 },
    marina: { x: 2500, y: 650 },
    oldtown: { x: 1300, y: 1150 },
    palm: { x: 700, y: 1650 },
    docks: { x: 2500, y: 2150 },
  };
  for (const lm of LANDMARKS) {
    const plot = landmarkPlots[lm.district];
    buildings.push({
      x: plot.x - lm.w / 2, y: plot.y - lm.h / 2,
      w: lm.w, h: lm.h, name: lm.name,
      district: lm.district, landmark: true,
    });
  }

  // Fill the blocks between roads with ordinary buildings.
  const blockNames = [
    'Apartments', 'Offices', 'Shops', 'Warehouse', 'Hotel', 'Market',
    'Garage', 'Cafe', 'Bank', 'Depot', 'Flats', 'Arcade',
  ];
  let nameIdx = 0;
  for (let bx = 0; bx < 5; bx++) {
    for (let by = 0; by < 4; by++) {
      const x0 = 80 + bx * 620;
      const y0 = 80 + by * 560;
      // Two buildings per block, jittered by the seeded RNG.
      for (let k = 0; k < 2; k++) {
        const w = rng.int(120, 220);
        const h = rng.int(90, 170);
        const x = x0 + rng.int(0, 260);
        const y = y0 + k * 260 + rng.int(0, 60);
        if (x + w > WORLD_W - 60 || y + h > WORLD_H - 60) continue;
        const cx = x + w / 2;
        const cy = y + h / 2;
        if (rectHitsRoad(x, y, w, h)) continue;
        if (buildings.some((b) => cx > b.x - 20 && cx < b.x + b.w + 20 && cy > b.y - 20 && cy < b.y + b.h + 20)) continue;
        buildings.push({
          x, y, w, h,
          name: blockNames[nameIdx++ % blockNames.length],
          district: districtAt(cx, cy).id,
          landmark: false,
        });
      }
    }
  }

  // Safehouse (mission 4 destination) and the mission anchor points.
  // Every anchor sits on open ground, just outside its building, so
  // the player can stand on it without colliding.
  const anchors = {
    safehouse: { x: 1150, y: 1650, name: 'Safehouse' },
    marinaPickup: { x: 2300, y: 620, name: 'Marina pickup' },
    casinoVault: { x: 700, y: 1780, name: 'Golden Palm vault' },
    dockDrop: { x: 2300, y: 2150, name: 'Dock 9 drop' },
    startSpot: { x: 1150, y: 1150, name: 'Palmera Heights' },
  };

  return { buildings, anchors, districtAt };
}

// True when the point is inside any building (used for collision).
export function hitsBuilding(city, x, y, pad = 0) {
  for (const b of city.buildings) {
    if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return b;
  }
  return null;
}

// True when the point is on a road (driving surface).
export function onRoadPoint(x, y) {
  return onRoad(x, y);
}
