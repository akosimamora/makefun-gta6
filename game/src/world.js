// The living world: player, traffic, pedestrians, police, wanted level
// and mission progress. Pure state + step function; rendering lives in
// render.js and staging for screenshots in shots.js.
import { WORLD, PLAYER, CAR, TRAFFIC_COUNT, PED_COUNT, WANTED, ROADS_X, ROADS_Y, ROAD_W } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';
import { buildCity, pointInBuilding, nearestRoadPoint } from './city.js';
import { MISSIONS, missionAt, getawayLabel } from './missions.js';
import { sfx } from './audio.js';

const CAR_COLORS = ['#c94f4f', '#4f7ec9', '#c9b24f', '#7ac94f', '#c97ab8', '#d8d8d8', '#3a3a3a', '#e08a3c'];

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function roadPoint(rng) {
  if (rng() < 0.5) {
    return { x: pick(rng, ROADS_X), y: range(rng, 120, WORLD.h - 120), vertical: true };
  }
  return { x: range(rng, 120, WORLD.w - 120), y: pick(rng, ROADS_Y), vertical: false };
}

export function createWorld(seed = 1337) {
  const rng = makeRng(seed);
  const city = buildCity(seed);
  const cars = [];
  for (let i = 0; i < TRAFFIC_COUNT; i++) {
    const p = roadPoint(rng);
    cars.push({
      id: i, x: p.x, y: p.y, angle: p.vertical ? (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (rng() < 0.5 ? 0 : Math.PI),
      speed: range(rng, 140, 240), color: pick(rng, CAR_COLORS),
      vertical: p.vertical, hp: CAR.maxHp, traffic: true, stolen: false,
    });
  }
  // A few parked cars near the start so the first steal is easy.
  const parked = [
    { x: 700, y: 300, color: '#c94f4f' },
    { x: 1100, y: 540, color: '#4f7ec9' },
    { x: 1500, y: 1020, color: '#c9b24f' },
  ];
  for (const p of parked) {
    cars.push({
      id: cars.length, x: p.x, y: p.y, angle: 0, speed: 0, color: p.color,
      vertical: false, hp: CAR.maxHp, traffic: false, stolen: false,
    });
  }
  const peds = [];
  for (let i = 0; i < PED_COUNT; i++) {
    const p = roadPoint(rng);
    peds.push({
      x: p.x + (p.vertical ? 60 : range(rng, -40, 40)),
      y: p.y + (p.vertical ? range(rng, -40, 40) : 60),
      angle: rng() * Math.PI * 2, speed: range(rng, 30, 70), color: pick(rng, ['#d8c9a3', '#a3c9d8', '#d8a3a3', '#a3d8b0']),
    });
  }
  return {
    city, rng, seed,
    time: 0,
    player: {
      x: 640, y: 360, angle: 0, hp: PLAYER.maxHp, ammo: PLAYER.pistolAmmo,
      inCar: null, speed: 0, lastShot: 0,
    },
    cars, peds,
    cops: [],
    heli: null,
    wanted: 0,
    wantedTimer: 0,
    cash: 0,
    missionIndex: 0,
    doneDistricts: [],
    damageTaken: 0,
    phase: 'title', // title | play | paused | busted | wasted | done
    getaway: '',
    message: '',
    messageTimer: 0,
    cam: { x: 640, y: 360 },
  };
}

function addWanted(world, n, why) {
  world.wanted = Math.min(WANTED.max, world.wanted + n);
  world.wantedTimer = WANTED.decayMs;
  if (why) {
    world.message = why;
    world.messageTimer = 2200;
  }
}

function spawnCops(world) {
  const p = world.player;
  const wantFoot = world.wanted >= 1 ? 2 : 0;
  const wantCars = world.wanted >= 2 ? Math.min(3, world.wanted - 1) : 0;
  while (world.cops.filter((c) => c.kind === 'foot').length < wantFoot) {
    const a = world.rng() * Math.PI * 2;
    world.cops.push({ kind: 'foot', x: p.x + Math.cos(a) * 420, y: p.y + Math.sin(a) * 420, speed: 200, hp: 50 });
  }
  while (world.cops.filter((c) => c.kind === 'car').length < wantCars) {
    const rp = nearestRoadPoint(p.x, p.y);
    world.cops.push({ kind: 'car', x: rp.x, y: rp.y, angle: 0, speed: 0, hp: CAR.maxHp, color: '#2f6fe0' });
  }
  if (world.wanted >= 3 && !world.heli) {
    world.heli = { x: p.x - 300, y: p.y - 300, angle: 0, timer: 0 };
  }
  if (world.wanted === 0) {
    world.cops = [];
    world.heli = null;
  }
}

function stepPlayer(world, input, dt) {
  const p = world.player;
  const ax = input.axis();
  if (p.inCar) {
    const car = p.inCar;
    const forward = ax.y !== 0 ? -ax.y : 0; // W = forward
    if (forward > 0) car.speed = Math.min(CAR.maxSpeed, car.speed + CAR.accel * dt);
    else if (forward < 0) car.speed = Math.max(-CAR.maxReverse, car.speed - CAR.accel * 0.6 * dt);
    else car.speed *= Math.max(0, 1 - 1.6 * dt);
    if (ax.x !== 0 && Math.abs(car.speed) > 20) {
      car.angle += ax.x * CAR.turnRate * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 200);
    }
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    if (!pointInBuilding(world.city, nx, ny, 24)) {
      car.x = nx;
      car.y = ny;
    } else {
      car.speed *= 0.4;
      if (Math.abs(car.speed) > 120) sfx.crash();
    }
    car.x = Math.max(40, Math.min(WORLD.w - 40, car.x));
    car.y = Math.max(40, Math.min(WORLD.h - 40, car.y));
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    if (input.wasPressed('e')) {
      p.inCar = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 40;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 40;
      p.speed = 0;
    }
    return;
  }
  // On foot.
  const len = Math.hypot(ax.x, ax.y) || 1;
  const nx = p.x + (ax.x / len) * PLAYER.walkSpeed * dt * (ax.x || ax.y ? 1 : 0);
  const ny = p.y + (ax.y / len) * PLAYER.walkSpeed * dt * (ax.x || ax.y ? 1 : 0);
  if (!pointInBuilding(world.city, nx, p.y, 16)) p.x = nx;
  if (!pointInBuilding(world.city, p.x, ny, 16)) p.y = ny;
  p.x = Math.max(24, Math.min(WORLD.w - 24, p.x));
  p.y = Math.max(24, Math.min(WORLD.h - 24, p.y));
  if (ax.x || ax.y) p.angle = Math.atan2(ax.y, ax.x);
  p.speed = (ax.x || ax.y) ? PLAYER.walkSpeed : 0;
  // Steal a nearby car.
  if (input.wasPressed('e')) {
    let best = null;
    let bestD = 90;
    for (const c of world.cars) {
      const d = dist(p.x, p.y, c.x, c.y);
      if (d < bestD) { bestD = d; best = c; }
    }
    if (best) {
      best.traffic = false;
      best.stolen = true;
      p.inCar = best;
      sfx.steal();
      addWanted(world, WANTED.stealCar, 'Car stolen — the law is coming');
    }
  }
}

function stepShooting(world, input, dt) {
  const p = world.player;
  if (p.inCar) return;
  const wantShoot = input.mouse.clicked || input.wasPressed(' ');
  if (input.wasPressed('r') && p.ammo < PLAYER.pistolAmmo) {
    p.ammo = PLAYER.pistolAmmo;
    sfx.reload();
    return;
  }
  if (!wantShoot || p.ammo <= 0) return;
  if (world.time - p.lastShot < 0.22) return;
  p.lastShot = world.time;
  p.ammo -= 1;
  sfx.shoot();
  const m = input.mouse;
  const aim = Math.atan2(m.y - 360, m.x - 640); // screen-centred aim; camera recentres each frame
  p.angle = aim;
  // Hit the nearest cop or traffic car roughly along the aim ray.
  let best = null;
  let bestD = PLAYER.pistolRange;
  for (const c of world.cops) {
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  if (best) {
    best.hp -= PLAYER.pistolDamage;
    addWanted(world, WANTED.shoot, 'Shots fired');
    if (best.hp <= 0) world.cops = world.cops.filter((c) => c !== best);
  }
}

function stepTraffic(world, dt) {
  for (const c of world.cars) {
    if (!c.traffic) continue;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (c.x < 60 || c.x > WORLD.w - 60 || c.y < 60 || c.y > WORLD.h - 60) {
      c.angle += Math.PI;
      c.x = Math.max(60, Math.min(WORLD.w - 60, c.x));
      c.y = Math.max(60, Math.min(WORLD.h - 60, c.y));
    }
  }
  for (const ped of world.peds) {
    ped.x += Math.cos(ped.angle) * ped.speed * dt;
    ped.y += Math.sin(ped.angle) * ped.speed * dt;
    if (ped.x < 60 || ped.x > WORLD.w - 60 || ped.y < 60 || ped.y > WORLD.h - 60 || world.rng() < dt * 0.05) {
      ped.angle = world.rng() * Math.PI * 2;
      ped.x = Math.max(60, Math.min(WORLD.w - 60, ped.x));
      ped.y = Math.max(60, Math.min(WORLD.h - 60, ped.y));
    }
  }
}

function stepCops(world, dt) {
  const p = world.player;
  spawnCops(world);
  for (const c of world.cops) {
    if (c.kind === 'foot') {
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      c.x += Math.cos(a) * c.speed * dt;
      c.y += Math.sin(a) * c.speed * dt;
      if (dist(c.x, c.y, p.x, p.y) < 26 && world.phase === 'play') {
        world.phase = 'busted';
        sfx.busted();
      }
    } else {
      const a = Math.atan2(p.y - c.y, p.x - c.x);
      let da = a - c.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      c.angle += Math.max(-2.4 * dt, Math.min(2.4 * dt, da));
      c.speed = Math.min(560, c.speed + 420 * dt);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (dist(c.x, c.y, p.x, p.y) < 40 && world.phase === 'play') {
        if (p.inCar) {
          p.inCar.hp -= 30 * dt;
          if (p.inCar.hp <= 0) {
            p.inCar = null;
            world.phase = 'busted';
            sfx.busted();
          }
        } else {
          world.phase = 'busted';
          sfx.busted();
        }
      }
    }
  }
  if (world.heli) {
    const h = world.heli;
    h.timer += dt;
    const tx = p.x - 160;
    const ty = p.y - 200;
    h.x += (tx - h.x) * Math.min(1, dt * 0.8);
    h.y += (ty - h.y) * Math.min(1, dt * 0.8);
    h.angle += dt * 0.5;
    if (Math.floor(h.timer * 2) !== Math.floor((h.timer - dt) * 2)) sfx.siren();
  }
}

function stepMission(world) {
  const m = missionAt(world.missionIndex);
  if (!m || world.phase !== 'play') return;
  const p = world.player;
  if (m.needsCar && !p.inCar) return;
  if (dist(p.x, p.y, m.target.x, m.target.y) < 110) {
    world.cash += m.cash;
    world.doneDistricts.push(m.district);
    sfx.mission();
    const g = getawayLabel(world.wanted, world.damageTaken);
    world.getaway = g;
    world.message = `${m.title} done — $${m.cash} · getaway ${g}`;
    world.messageTimer = 3000;
    world.missionIndex += 1;
    if (m.heat) addWanted(world, m.heat, 'The heat is on');
    if (world.missionIndex >= MISSIONS.length) {
      world.phase = 'done';
    }
  }
}

export function updateWorld(world, input, dt) {
  if (world.phase === 'title') {
    if (input.wasPressed('Enter')) {
      world.phase = 'play';
      sfx.unlock();
      sfx.mission();
    }
    return;
  }
  if (world.phase === 'paused') {
    if (input.wasPressed('p') || input.wasPressed('Escape')) world.phase = 'play';
    return;
  }
  if (world.phase === 'busted' || world.phase === 'wasted' || world.phase === 'done') {
    if (input.wasPressed('Enter')) {
      const fresh = createWorld(world.seed);
      fresh.phase = 'play';
      Object.assign(world, fresh);
    }
    return;
  }
  if (input.wasPressed('p') || input.wasPressed('Escape')) {
    world.phase = 'paused';
    return;
  }
  world.time += dt;
  if (world.messageTimer > 0) world.messageTimer -= dt * 1000;
  if (world.wanted > 0) {
    world.wantedTimer -= dt * 1000;
    if (world.wantedTimer <= 0) {
      world.wanted -= 1;
      world.wantedTimer = WANTED.decayMs;
    }
  }
  stepPlayer(world, input, dt);
  stepShooting(world, input, dt);
  stepTraffic(world, dt);
  stepCops(world, dt);
  stepMission(world);
  if (world.player.hp <= 0 && world.phase === 'play') {
    world.phase = 'wasted';
    sfx.busted();
  }
  // Camera follows the player, clamped to the world.
  const p = world.player;
  world.cam.x += (p.x - world.cam.x) * Math.min(1, dt * 5);
  world.cam.y += (p.y - world.cam.y) * Math.min(1, dt * 5);
  world.cam.x = Math.max(640, Math.min(WORLD.w - 640, world.cam.x));
  world.cam.y = Math.max(360, Math.min(WORLD.h - 360, world.cam.y));
}
