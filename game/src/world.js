// The living city: player, traffic, pedestrians, police and the helicopter.
import {
  WORLD_W, WORLD_H, TRAFFIC_CARS, PEDESTRIANS, MAX_WANTED,
  PISTOL_AMMO, PLAYER_HP, WALK_SPEED, CAR_ACCEL, CAR_TOP_SPEED,
  CAR_BRAKE, CAR_TURN, RELOAD_MS, SHOT_COOLDOWN_MS,
} from './config.js';
import { nearestRoadX, nearestRoadY } from './city.js';

const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#8e44ad', '#e67e22'];
const PED_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];

export function createWorld(city, rng) {
  const cars = [];
  for (let i = 0; i < TRAFFIC_CARS; i++) {
    const vertical = rng.chance(0.5);
    cars.push({
      x: vertical ? nearestRoadX(rng.range(200, WORLD_W - 200)) : rng.range(200, WORLD_W - 200),
      y: vertical ? rng.range(200, WORLD_H - 200) : nearestRoadY(rng.range(200, WORLD_H - 200)),
      angle: vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
      speed: rng.range(120, 220),
      color: rng.pick(CAR_COLORS),
      traffic: true,
      vertical,
    });
  }
  // A few parked cars the player can steal.
  for (let i = 0; i < 6; i++) {
    cars.push({
      x: rng.range(300, WORLD_W - 300),
      y: nearestRoadY(rng.range(300, WORLD_H - 300)),
      angle: rng.chance(0.5) ? 0 : Math.PI,
      speed: 0,
      color: rng.pick(CAR_COLORS),
      traffic: false,
      vertical: false,
    });
  }
  const peds = [];
  for (let i = 0; i < PEDESTRIANS; i++) {
    peds.push({
      x: rng.range(150, WORLD_W - 150),
      y: rng.range(150, WORLD_H - 150),
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(30, 70),
      color: rng.pick(PED_COLORS),
      turnIn: rng.range(1, 4),
    });
  }
  return {
    player: {
      x: 600, y: 900, angle: 0, speed: 0, onFoot: true, car: null,
      hp: PLAYER_HP, ammo: PISTOL_AMMO, wanted: 0, cash: 0,
      reloadUntil: 0, lastShot: 0, aim: 0,
    },
    cars, peds,
    cops: [], copCars: [],
    heli: { x: 600, y: 900, active: false },
    shots: [],
    wantedPeak: 0, shotsFired: 0,
    busted: false, wasted: false,
    time: 0, crimeTimer: 0,
  };
}

function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
function dist(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return Math.sqrt(dx * dx + dy * dy); }

export function addWanted(world, n) {
  const p = world.player;
  p.wanted = clamp(p.wanted + n, 0, MAX_WANTED);
  if (p.wanted > world.wantedPeak) world.wantedPeak = p.wanted;
  world.crimeTimer = 0;
}

export function updateWorld(world, input, dt, audio, view) {
  const p = world.player;
  if (world.busted || world.wasted) return;
  world.time += dt;

  // Wanted slowly cools off when the player stays clean.
  world.crimeTimer += dt;
  if (world.crimeTimer > 14 && p.wanted > 0) { p.wanted -= 1; world.crimeTimer = 0; }

  // Aim at the mouse.
  const wx = view.x + input.mouse.x;
  const wy = view.y + input.mouse.y;
  p.aim = Math.atan2(wy - p.y, wx - p.x);

  if (p.onFoot) {
    let mx = 0, my = 0;
    if (input.down('KeyW') || input.down('ArrowUp')) my -= 1;
    if (input.down('KeyS') || input.down('ArrowDown')) my += 1;
    if (input.down('KeyA') || input.down('ArrowLeft')) mx -= 1;
    if (input.down('KeyD') || input.down('ArrowRight')) mx += 1;
    if (mx || my) {
      const len = Math.hypot(mx, my);
      p.x = clamp(p.x + (mx / len) * WALK_SPEED * dt, 20, WORLD_W - 20);
      p.y = clamp(p.y + (my / len) * WALK_SPEED * dt, 20, WORLD_H - 20);
      p.angle = Math.atan2(my, mx);
    }
    // Steal a nearby car.
    if (input.consumePressed('KeyE')) {
      const car = nearestCar(world, p.x, p.y, 70);
      if (car) {
        car.traffic = false;
        p.car = car;
        p.onFoot = false;
        p.speed = 0;
        p.x = car.x; p.y = car.y; p.angle = car.angle;
        addWanted(world, 1);
        audio.pickup();
      }
    }
    // Shoot toward the mouse.
    const now = performance.now();
    const click = input.consumeClick();
    if ((input.down('Space') || click) && now - p.lastShot > SHOT_COOLDOWN_MS && now > p.reloadUntil) {
      if (p.ammo > 0) {
        p.ammo -= 1;
        p.lastShot = now;
        world.shotsFired += 1;
        const a = click ? Math.atan2(click.y + view.y - p.y, click.x + view.x - p.x) : p.aim;
        world.shots.push({ x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22, vx: Math.cos(a) * 900, vy: Math.sin(a) * 900, life: 0.5 });
        addWanted(world, 1);
        audio.shot();
      }
    }
    if (input.consumePressed('KeyR') && p.ammo < PISTOL_AMMO) {
      p.ammo = PISTOL_AMMO;
      p.reloadUntil = now + RELOAD_MS;
      audio.reload();
    }
  } else {
    const car = p.car;
    if (input.down('KeyW') || input.down('ArrowUp')) car.speed = Math.min(car.speed + CAR_ACCEL * dt, CAR_TOP_SPEED);
    else if (input.down('KeyS') || input.down('ArrowDown')) car.speed = Math.max(car.speed - CAR_BRAKE * dt, -160);
    else car.speed *= Math.pow(0.4, dt);
    if (Math.abs(car.speed) > 20) {
      const steer = (input.down('KeyA') || input.down('ArrowLeft') ? -1 : 0) + (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0);
      car.angle += steer * CAR_TURN * dt * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 200);
    }
    car.x = clamp(car.x + Math.cos(car.angle) * car.speed * dt, 20, WORLD_W - 20);
    car.y = clamp(car.y + Math.sin(car.angle) * car.speed * dt, 20, WORLD_H - 20);
    p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
    if (input.consumePressed('KeyE')) {
      p.onFoot = true;
      p.car = null;
      p.speed = 0;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
    }
    // Ramming a traffic car at speed is a crime and a crash.
    for (const other of world.cars) {
      if (other === car || !other.traffic) continue;
      if (dist(car.x, car.y, other.x, other.y) < 34 && Math.abs(car.speed) > 120) {
        addWanted(world, 1);
        audio.crash();
        car.speed *= 0.4;
        other.speed = 60;
      }
    }
  }

  // Bullets fly and hit cops.
  for (let i = world.shots.length - 1; i >= 0; i--) {
    const s = world.shots[i];
    s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
    if (s.life <= 0) { world.shots.splice(i, 1); continue; }
    for (let j = world.cops.length - 1; j >= 0; j--) {
      if (dist(s.x, s.y, world.cops[j].x, world.cops[j].y) < 18) {
        world.cops.splice(j, 1);
        world.shots.splice(i, 1);
        break;
      }
    }
  }

  updateTraffic(world, dt);
  updatePeds(world, dt);
  updatePolice(world, dt, audio);
}

function nearestCar(world, x, y, maxD) {
  let best = null, bestD = maxD;
  for (const c of world.cars) {
    const d = dist(x, y, c.x, c.y);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best;
}

function updateTraffic(world, dt) {
  for (const c of world.cars) {
    if (!c.traffic) continue;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (c.x < 100 || c.x > WORLD_W - 100 || c.y < 100 || c.y > WORLD_H - 100) {
      c.angle += Math.PI / 2;
      c.x = clamp(c.x, 120, WORLD_W - 120);
      c.y = clamp(c.y, 120, WORLD_H - 120);
    }
    // Keep to the road: snap onto the nearest lane.
    if (c.vertical) c.x += (nearestRoadX(c.x) - c.x) * Math.min(1, dt * 2);
    else c.y += (nearestRoadY(c.y) - c.y) * Math.min(1, dt * 2);
  }
}

function updatePeds(world, dt) {
  for (const pd of world.peds) {
    pd.turnIn -= dt;
    if (pd.turnIn <= 0) { pd.angle += (Math.random() - 0.5) * 2; pd.turnIn = 2 + Math.random() * 3; }
    pd.x = clamp(pd.x + Math.cos(pd.angle) * pd.speed * dt, 40, WORLD_W - 40);
    pd.y = clamp(pd.y + Math.sin(pd.angle) * pd.speed * dt, 40, WORLD_H - 40);
  }
}

function updatePolice(world, dt, audio) {
  const p = world.player;
  const want = p.wanted;
  const footWant = want >= 1 ? Math.min(want, 3) : 0;
  const carWant = want >= 2 ? Math.min(want - 1, 3) : 0;
  while (world.cops.length < footWant) {
    const a = Math.random() * Math.PI * 2;
    world.cops.push({ x: p.x + Math.cos(a) * 500, y: p.y + Math.sin(a) * 500, angle: 0, speed: 200 });
  }
  while (world.copCars.length < carWant) {
    const a = Math.random() * Math.PI * 2;
    world.copCars.push({ x: p.x + Math.cos(a) * 620, y: p.y + Math.sin(a) * 620, angle: 0, speed: 320, color: '#1a1a2e' });
  }
  if (world.cops.length > footWant) world.cops.length = footWant;
  if (world.copCars.length > carWant) world.copCars.length = carWant;

  for (const cop of world.cops) {
    const a = Math.atan2(p.y - cop.y, p.x - cop.x);
    cop.angle = a;
    cop.x += Math.cos(a) * cop.speed * dt;
    cop.y += Math.sin(a) * cop.speed * dt;
    if (p.onFoot && dist(cop.x, cop.y, p.x, p.y) < 26) {
      world.busted = true;
      audio.busted();
      audio.siren(false);
      return;
    }
  }
  for (const cc of world.copCars) {
    const a = Math.atan2(p.y - cc.y, p.x - cc.x);
    cc.angle = a;
    cc.x += Math.cos(a) * cc.speed * dt;
    cc.y += Math.sin(a) * cc.speed * dt;
    if (dist(cc.x, cc.y, p.x, p.y) < 36) {
      if (!p.onFoot) {
        p.hp -= 26 * dt * 10;
        if (p.hp <= 0) { p.hp = 0; world.wasted = true; audio.busted(); }
      } else {
        world.busted = true;
        audio.busted();
        audio.siren(false);
        return;
      }
    }
  }

  world.heli.active = want >= 3;
  if (world.heli.active) {
    world.heli.x += (p.x - world.heli.x) * Math.min(1, dt * 1.5);
    world.heli.y += (p.y - world.heli.y) * Math.min(1, dt * 1.5);
  }
  audio.siren(want >= 1);
}
