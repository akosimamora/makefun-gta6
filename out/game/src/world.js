// Game state + simulation: player, traffic, pedestrians, police, helicopter,
// wanted heat, missions, district reputation and the getaway rating.
window.SOL = window.SOL || {};
SOL.createWorld = function (cfg) {
  const city = SOL.buildCity(cfg);
  const rng = SOL.makeRng(cfg.seed + 7);
  const palette = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#8e44ad', '#16a085', '#e67e22'];
  const cars = [];
  for (let i = 0; i < cfg.trafficCount; i++) {
    const horizontal = rng.chance(0.5);
    const road = horizontal ? rng.pick(city.roadsH) : rng.pick(city.roadsV);
    cars.push({
      id: i, traffic: true, parked: rng.chance(0.35),
      x: horizontal ? rng.range(100, cfg.worldW - 100) : road,
      y: horizontal ? road : rng.range(100, cfg.worldH - 100),
      angle: horizontal ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2),
      speed: 0, cruise: rng.range(90, 150), color: rng.pick(palette), hp: cfg.carHp,
    });
  }
  const peds = [];
  for (let i = 0; i < cfg.pedCount; i++) {
    peds.push({
      x: rng.range(100, cfg.worldW - 100), y: rng.range(100, cfg.worldH - 100),
      angle: rng.range(0, Math.PI * 2), speed: rng.range(24, 48),
      color: rng.pick(['#e74c3c', '#3498db', '#f39c12', '#9b59b6', '#1abc9c', '#ecf0f1']),
      flee: 0,
    });
  }
  const best = SOL.save.load();
  return {
    cfg, city, rng, time: 0, mode: 'title',
    player: {
      x: 600, y: 900, angle: -Math.PI / 2, speed: 0, onFoot: true, carId: -1,
      hp: cfg.playerHp, ammo: cfg.pistolAmmo, reloading: 0, cash: 0,
      wanted: 0, quietMs: 0, district: 'palmera',
    },
    cars, peds, cops: [], heli: { x: 600, y: 900, active: false },
    missionIndex: 0, rep: { palmera: 0, marina: 0, downtown: 0, golden: 0, oldtown: 0 },
    mess: 0, message: '', messageMs: 0, shotsFired: 0, hits: 0,
    best, cam: { x: 600, y: 900 }, shake: 0, sirenMs: 0,
  };
};

SOL.dist = function (ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); };
SOL.clamp = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

SOL.addWanted = function (w, n) {
  const p = w.player;
  p.wanted = SOL.clamp(p.wanted + n, 0, w.cfg.maxWanted);
  p.quietMs = 0;
  if (p.wanted > 0 && w.sirenMs <= 0) { SOL.audio.siren(); w.sirenMs = 2600; }
};

SOL.nearestCar = function (w, x, y, maxD) {
  let best = null, bd = maxD;
  for (const c of w.cars) {
    const d = SOL.dist(x, y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
};

SOL.updateWorld = function (w, dt, input, mouseWorld) {
  const cfg = w.cfg, p = w.player;
  w.time += dt * 1000;
  if (w.messageMs > 0) w.messageMs -= dt * 1000;
  if (w.sirenMs > 0) w.sirenMs -= dt * 1000;
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt * 30);
  if (w.mode !== 'playing') return;

  // --- wanted heat decays after a quiet stretch ---
  if (p.wanted > 0) {
    p.quietMs += dt * 1000;
    if (p.quietMs > cfg.wantedDecayMs) { p.wanted--; p.quietMs = 0; }
  }
  // --- police presence follows the heat ---
  const wantFoot = p.wanted >= 1 ? Math.min(2 + p.wanted, 6) : 0;
  while (w.cops.length < wantFoot) {
    const a = w.rng.range(0, Math.PI * 2);
    w.cops.push({ x: p.x + Math.cos(a) * 700, y: p.y + Math.sin(a) * 700, angle: 0, speed: 0, hp: 100, car: p.wanted >= 3 && w.cops.length % 2 === 1 });
  }
  if (w.cops.length > wantFoot) w.cops.length = wantFoot;
  w.heli.active = p.wanted >= cfg.heliAtWanted;
  if (w.heli.active) {
    w.heli.x += (p.x - w.heli.x) * Math.min(1, dt * 1.4);
    w.heli.y += (p.y - w.heli.y) * Math.min(1, dt * 1.4);
  }

  // --- player: on foot ---
  if (p.onFoot) {
    let mx = 0, my = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) my -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) my += 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) mx -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) mx += 1;
    if (mx || my) {
      const len = Math.sqrt(mx * mx + my * my);
      p.x += (mx / len) * cfg.walkSpeed * dt;
      p.y += (my / len) * cfg.walkSpeed * dt;
      p.angle = Math.atan2(my, mx);
    }
    p.x = SOL.clamp(p.x, 20, cfg.worldW - 20);
    p.y = SOL.clamp(p.y, 20, cfg.worldH - 20);
    // Steal the nearest car with E.
    if (input.hit('KeyE')) {
      const car = SOL.nearestCar(w, p.x, p.y, 70);
      if (car) {
        p.onFoot = false; p.carId = car.id; car.traffic = false; car.parked = false;
        p.angle = car.angle; p.speed = 0;
        SOL.addWanted(w, 1);
        w.message = 'Car stolen — the law is coming'; w.messageMs = 2600;
        SOL.audio.pickup();
      }
    }
    // Shoot toward the mouse with click or Space.
    if (p.reloading > 0) p.reloading -= dt * 1000;
    const wantShot = (input.click() || input.hit('Space')) && p.reloading <= 0 && p.ammo > 0;
    if (wantShot) {
      p.ammo--; w.shotsFired++;
      p.angle = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
      SOL.audio.shot(); w.shake = 6;
      let hit = null, bd = cfg.shotRange;
      for (const c of w.cops) {
        const d = SOL.dist(p.x, p.y, c.x, c.y);
        const ang = Math.abs(Math.atan2(c.y - p.y, c.x - p.x) - p.angle);
        if (d < bd && ang < 0.35) { bd = d; hit = c; }
      }
      if (hit) {
        w.hits++; hit.hp -= 34;
        if (hit.hp <= 0) { w.cops.splice(w.cops.indexOf(hit), 1); SOL.addWanted(w, 1); w.mess++; }
      } else {
        for (const pd of w.peds) {
          if (SOL.dist(p.x, p.y, pd.x, pd.y) < 120) pd.flee = 3000;
        }
      }
    }
    if (input.hit('KeyR') && p.ammo < cfg.pistolAmmo && p.reloading <= 0) {
      p.reloading = cfg.reloadMs; p.ammo = cfg.pistolAmmo;
    }
  } else {
    // --- player: driving ---
    const car = w.cars[p.carId];
    if (!car) { p.onFoot = true; p.carId = -1; }
    else {
      const fwd = input.down('KeyW') || input.down('ArrowUp');
      const back = input.down('KeyS') || input.down('ArrowDown');
      const left = input.down('KeyA') || input.down('ArrowLeft');
      const right = input.down('KeyD') || input.down('ArrowRight');
      if (fwd) p.speed += cfg.carAccel * dt;
      if (back) p.speed -= cfg.carBrake * dt;
      p.speed = SOL.clamp(p.speed, -140, cfg.carMaxSpeed);
      if (!fwd && !back) p.speed *= Math.max(0, 1 - dt * 1.6);
      if (Math.abs(p.speed) > 20) p.angle += (left ? -1 : 0 + (right ? 1 : 0)) * cfg.carTurn * dt * Math.sign(p.speed);
      const nx = p.x + Math.cos(p.angle) * p.speed * dt;
      const ny = p.y + Math.sin(p.angle) * p.speed * dt;
      let blocked = false;
      for (const b of w.city.buildings) {
        if (nx > b.x - 14 && nx < b.x + b.w + 14 && ny > b.y - 14 && ny < b.y + b.h + 14) { blocked = true; break; }
      }
      for (const l of w.city.landmarks) {
        if (nx > l.x - 12 && nx < l.x + l.w + 12 && ny > l.y - 12 && ny < l.y + l.h + 12) { blocked = true; break; }
      }
      if (blocked) {
        if (Math.abs(p.speed) > 180) { SOL.audio.crash(); w.shake = 10; w.mess++; car.hp -= 12; p.speed *= -0.25; }
        else p.speed *= 0.4;
      } else { p.x = nx; p.y = ny; }
      car.x = p.x; car.y = p.y; car.angle = p.angle; car.speed = p.speed;
      p.x = SOL.clamp(p.x, 20, cfg.worldW - 20);
      p.y = SOL.clamp(p.y, 20, cfg.worldH - 20);
      if (car.hp <= 0) { p.onFoot = true; p.carId = -1; p.speed = 0; w.message = 'Your ride is wrecked'; w.messageMs = 2600; }
      if (input.hit('KeyE')) { p.onFoot = true; p.carId = -1; p.speed = 0; car.parked = true; }
    }
  }

  // --- traffic: cruise the roads, slow near the player ---
  for (const c of w.cars) {
    if (!c.traffic) continue;
    if (c.parked) continue;
    const nearPlayer = SOL.dist(c.x, c.y, p.x, p.y) < 130;
    const target = nearPlayer ? c.cruise * 0.25 : c.cruise;
    c.speed += (target - c.speed) * Math.min(1, dt * 0.8);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (c.x < 40 || c.x > cfg.worldW - 40 || c.y < 40 || c.y > cfg.worldH - 40) {
      c.angle += Math.PI; c.x = SOL.clamp(c.x, 40, cfg.worldW - 40); c.y = SOL.clamp(c.y, 40, cfg.worldH - 40);
    }
  }
  // --- pedestrians: stroll, flee gunfire ---
  for (const pd of w.peds) {
    if (pd.flee > 0) { pd.flee -= dt * 1000; pd.speed = 130; }
    else pd.speed = 34;
    pd.x += Math.cos(pd.angle) * pd.speed * dt;
    pd.y += Math.sin(pd.angle) * pd.speed * dt;
    if (pd.x < 30 || pd.x > cfg.worldW - 30 || pd.y < 30 || pd.y > cfg.worldH - 30 || w.rng.chance(dt * 0.15)) {
      pd.angle = w.rng.range(0, Math.PI * 2);
      pd.x = SOL.clamp(pd.x, 30, cfg.worldW - 30); pd.y = SOL.clamp(pd.y, 30, cfg.worldH - 30);
    }
  }
  // --- cops: chase, touch = busted on foot, ram the car ---
  for (const c of w.cops) {
    const d = SOL.dist(c.x, c.y, p.x, p.y);
    const ang = Math.atan2(p.y - c.y, p.x - c.x);
    c.angle = ang;
    const spd = c.car ? 330 : 205;
    c.x += Math.cos(ang) * spd * dt;
    c.y += Math.sin(ang) * spd * dt;
    if (d < 26) {
      if (p.onFoot) { w.mode = 'busted'; SOL.audio.busted(); return; }
      const car = w.cars[p.carId];
      if (car) { car.hp -= 22 * dt * 10; w.shake = 8; if (car.hp <= 0) { p.onFoot = true; p.carId = -1; } }
    }
  }
  if (p.hp <= 0) { w.mode = 'wasted'; return; }

  // --- missions ---
  const m = SOL.missionAt(w.missionIndex);
  const md = SOL.dist(p.x, p.y, m.target.x, m.target.y);
  const inCarOk = !m.needCar || !p.onFoot;
  if (md < m.target.r && inCarOk && (!m.loseCops || p.wanted === 0)) {
    p.cash += m.cash;
    const d = SOL.districtAt(cfg, p.x, p.y);
    w.rep[d.id] = (w.rep[d.id] || 0) + 1;
    w.best.bestCash = Math.max(w.best.bestCash, p.cash);
    w.best.jobsDone = Math.max(w.best.jobsDone, w.missionIndex + 1);
    SOL.save.store(w.best.bestCash, w.best.jobsDone);
    SOL.audio.mission(); SOL.audio.coin();
    w.missionIndex++;
    if (w.missionIndex >= SOL.missionList.length) {
      w.mode = 'done';
      w.message = 'All jobs done — Mara owns Solmara now';
    } else {
      w.message = `Job done: ${m.title} +$${m.cash} — next: ${SOL.missionAt(w.missionIndex).title}`;
    }
    w.messageMs = 3400;
  }
  p.district = SOL.districtAt(cfg, p.x, p.y).id;

  // --- camera follows the player ---
  w.cam.x += (p.x - w.cam.x) * Math.min(1, dt * 5);
  w.cam.y += (p.y - w.cam.y) * Math.min(1, dt * 5);
};

SOL.getawayRating = function (w) {
  if (w.mess === 0) return 'CLEAN';
  if (w.mess <= 3) return 'MESSY';
  return 'CHAOS';
};
