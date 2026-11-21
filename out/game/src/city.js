// Solmara layout: five districts on a road grid, buildings tucked inside
// blocks, landmarks centred in their block so they never block a road.
window.SOL = window.SOL || {};
SOL.buildCity = function (cfg) {
  const rng = SOL.makeRng(cfg.seed);
  const roadsV = [];
  const roadsH = [];
  for (let x = cfg.roadGap; x < cfg.worldW; x += cfg.roadGap) roadsV.push(x);
  for (let y = cfg.roadGap; y < cfg.worldH; y += cfg.roadGap) roadsH.push(y);
  const half = cfg.roadHalf;
  function onRoad(x, y) {
    for (const rx of roadsV) if (Math.abs(x - rx) < half + 46) return true;
    for (const ry of roadsH) if (Math.abs(y - ry) < half + 46) return true;
    return false;
  }
  function rectHitsRoad(x, y, w, h) {
    // A building is illegal when its rectangle overlaps any road band.
    for (const rx of roadsV) {
      if (x < rx + half && x + w > rx - half) return true;
    }
    for (const ry of roadsH) {
      if (y < ry + half && y + h > ry - half) return true;
    }
    return false;
  }
  const buildings = [];
  for (let bx = 0; bx < cfg.worldW / cfg.roadGap; bx++) {
    for (let by = 0; by < cfg.worldH / cfg.roadGap; by++) {
      const x0 = bx * cfg.roadGap + half + 14;
      const y0 = by * cfg.roadGap + half + 14;
      const bw = cfg.roadGap - 2 * half - 28;
      const bh = cfg.roadGap - 2 * half - 28;
      const n = rng.int(1, 2);
      for (let i = 0; i < n; i++) {
        const w = rng.range(70, 130);
        const h = rng.range(70, 120);
        const x = rng.range(x0, x0 + bw - w);
        const y = rng.range(y0, y0 + bh - h);
        if (rectHitsRoad(x, y, w, h)) continue;
        buildings.push({ x, y, w, h, tone: rng.pick(['#3a4a5a', '#46586a', '#54423a', '#3d5a4a', '#5a4a3a']) });
      }
    }
  }
  const landmarks = [
    { id: 'soltower', name: 'Sol Tower', x: 525, y: 525, w: 150, h: 150, color: '#c9a227' },
    { id: 'cityhall', name: 'City Hall', x: 2115, y: 540, w: 170, h: 120, color: '#7d8aa0' },
    { id: 'goldenpalm', name: 'Golden Palm', x: 890, y: 1730, w: 220, h: 140, color: '#d4af37' },
    { id: 'marina', name: 'Marina Pier', x: 1300, y: 170, w: 200, h: 60, color: '#4aa3c7' },
    { id: 'safehouse', name: 'Safehouse', x: 2540, y: 2150, w: 120, h: 100, color: '#7fb069' },
  ];
  return { roadsV, roadsH, buildings, landmarks, onRoad };
};
SOL.districtAt = function (cfg, x, y) {
  for (const d of cfg.districts) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return cfg.districts[0];
};
