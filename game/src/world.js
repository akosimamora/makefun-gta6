// The living world of Solmara: Mara on foot or in a car, traffic, pedestrians,
// police who answer the wanted level, a helicopter at three stars, and the
// particles and bullets that make a chase feel like one. The world advances in
// fixed steps; the renderer only paints what is here.

import { CAMERA, CAR, PED, PLAYER, WANTED, WORLD_H, WORLD_W } from './config.js';
import { districtAt, hitsSolid, nearestRoadPoint, onRoad, slideOut } from './city.js';
import { createMissionState, updateMissions } from './missions.js';

export const EVENT_BUSTED = 1;
export const EVENT_WASTED = 2;

const TRAFFIC_COLORS = ['#c9a227', '#7a9e7e', '#4a6fa5', '#a54a4a', '#8a8a8a', '#d9d9d9', '#2e5e4e'];
const SPORT_COLORS = ['#d9381e', '#e8a13a', '#1e6fd9'];

// A car. Traffic cars follow the roads; the player's car answers the keys;
// a police car hunts the player and rams.
function makeCar(id, x, y, angle, kind, color, isPolice) {
  return {
    id, x, y, angle, vx: 0, vy: 0, speed: 0,
    kind, color, isPolice: !!isPolice,
    health: CAR.health, isPlayer: false, isTraffic: !isPolice,
    driver: !isPolice, // a traffic car carries a driver Mara can pull out
    stuck: 0, // seconds this traffic car has not moved
    smoke: 0, wrecked: false,
  };
}

// A pedestrian: walks the sidewalks, flees from gunfire and sirens.
function makePed(rng, x, y) {
  return {
    x, y, angle: rng.range(0, Math.PI * 2),
    speed: PED.walkSpeed * rng.range(0.8, 1.2),
    state: 'walk', tx: x, ty: y, wait: rng.range(0, 3),
    color: rng.pick(['#e8b48a', '#7a5cc9', '#2e7f9e', '#c98a2e', '#5c8a2e', '#a54a4a']),
  };
}

export function createWorld(city, rng, save) {
  const start = city.spots.playerStart;
  const world = {
    city, rng, time: 0,
    player: {
      x: start.x, y: start.y, angle: -Math.PI / 2, vx: 0, vy: 0,
      onFoot: true, carId: null, health: PLAYER.health,
      ammo: PLAYER.ammoMax, cash: save?.cash ?? 250, rep: save?.rep ?? 0,
      lastShot: 0, speed: 0, moving: false,
    },
    cars: [],
    peds: [],
    cops: [],
    heli: { active: false, x: start.x, y: start.y - 300, angle: 0, rotor: 0 },
    wanted: { stars: 0, timer: 0, cooling: false },
    particles: [],
    tracers: [],
    camera: { x: start.x, y: start.y, zoom: 1, shake: 0 },
    mission: createMissionState(save?.missionsDone ?? 0),
    // Standing per district, 0-100: the minimap tints a district gold as it rises.
    districtRep: { marina: 0, heights: 0, neon: 0, calle: 0, docks: 0 },
    stats: { shotsFired: 0, carsStolen: 0, maxWanted: 0, damageDealt: 0 },
    message: '', messageTimer: 0,
    busted: false, wasted: false,
  };

  // Traffic, spread across the roads.
  for (let i = 0; i < CAR.trafficCount; i++) {
    const p = nearestRoadPoint(city, rng.range(500, WORLD_W - 200), rng.range(300, WORLD_H - 200));
    const angle = rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    const car = makeCar(i, p.x, p.y, angle, rng.chance(0.12) ? 'van' : 'sedan', rng.pick(TRAFFIC_COLORS), false);
    car.speed = CAR.trafficSpeed * rng.range(0.8, 1.1);
    world.cars.push(car);
  }
  // The getaway car, parked by the garage for the first mission.
  const gc = makeCar(1000, city.spots.garage.x, city.spots.garage.y, 0, 'sports', SPORT_COLORS[0], false);
  gc.isTraffic = false;
  world.cars.push(gc);

  // Pedestrians, on the sidewalks.
  for (let i = 0; i < PED.count; i++) {
    const p = nearestRoadPoint(city, rng.range(500, WORLD_W - 200), rng.range(300, WORLD_H - 200));
    world.peds.push(makePed(rng, p.x + rng.range(-50, 50), p.y + rng.range(-50, 50)));
  }

  return world;
}

// --- wanted ----------------------------------------------------------------
export function addWanted(world, stars, reason) {
  const w = world.wanted;
  w.stars = Math.min(WANTED.maxStars, w.stars + stars);
  w.timer = 0;
  w.cooling = false;
  world.stats.maxWanted = Math.max(world.stats.maxWanted, Math.floor(w.stars));
  if (reason) showMessage(world, reason);
}

export function showMessage(world, text, seconds = 3) {
  world.message = text;
  world.messageTimer = seconds;
}

// --- entering and leaving cars ----------------------------------------------
export function nearestCar(world, x, y, maxD) {
  let best = null;
  let bestD = maxD;
  for (const car of world.cars) {
    if (car.isPlayer || car.wrecked) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

export function enterCar(world, car) {
  const p = world.player;
  p.onFoot = false;
  p.carId = car.id;
  car.isPlayer = true;
  car.isTraffic = false;
  if (car.driver) {
    // The driver is pulled out and flees on foot.
    car.driver = false;
    const ped = makePed(world.rng, car.x + 40, car.y + 40);
    ped.state = 'flee';
    ped.tx = car.x + 200;
    ped.ty = car.y + 200;
    world.peds.push(ped);
    addWanted(world, 1, 'Car stolen — the cops were called!');
    world.stats.carsStolen += 1;
  }
  p.angle = car.angle;
}

export function exitCar(world) {
  const p = world.player;
  const car = world.cars.find((c) => c.id === p.carId);
  if (!car) return;
  p.onFoot = true;
  p.carId = null;
  car.isPlayer = false;
  p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
  p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
  const fixed = slideOut(world.city, p.x, p.y, PLAYER.radius);
  p.x = fixed.x;
  p.y = fixed.y;
  p.angle = car.angle;
  p.vx = 0;
  p.vy = 0;
}

// --- shooting ----------------------------------------------------------------
export function playerShoot(world, targetX, targetY) {
  const p = world.player;
  if (!p.onFoot) return;
  if (world.time - p.lastShot < PLAYER.pistolCooldown) return;
  if (p.ammo <= 0) {
    showMessage(world, 'Out of ammo — find the safehouse to restock.');
    p.lastShot = world.time;
    return;
  }
  p.ammo -= 1;
  p.lastShot = world.time;
  world.stats.shotsFired += 1;
  const angle = Math.atan2(targetY - p.y, targetX - p.x);
  p.angle = angle;
  const muzzleX = p.x + Math.cos(angle) * 20;
  const muzzleY = p.y + Math.sin(angle) * 20;
  // A hit-scan shot: the nearest thing near the aim line takes the hit.
  let best = null;
  let bestD = PLAYER.pistolRange;
  const consider = (x, y, radius, target) => {
    const dx = x - muzzleX;
    const dy = y - muzzleY;
    const along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 0 || along > PLAYER.pistolRange) return;
    const across = Math.abs(-dx * Math.sin(angle) + dy * Math.cos(angle));
    if (across > radius + 14) return;
    if (along < bestD) { bestD = along; best = target; }
  };
  for (const ped of world.peds) consider(ped.x, ped.y, PED.radius, { kind: 'ped', ref: ped });
  for (const cop of world.cops) consider(cop.x, cop.y, PED.radius, { kind: 'cop', ref: cop });
  for (const car of world.cars) consider(car.x, car.y, 30, { kind: 'car', ref: car });
  const endX = muzzleX + Math.cos(angle) * (best ? bestD : PLAYER.pistolRange);
  const endY = muzzleY + Math.sin(angle) * (best ? bestD : PLAYER.pistolRange);
  world.tracers.push({ x1: muzzleX, y1: muzzleY, x2: endX, y2: endY, life: 0.09 });
  spark(world, endX, endY, '#f2c94c', 6);
  if (best) {
    if (best.kind === 'ped') {
      best.ref.state = 'flee';
      world.stats.damageDealt += PLAYER.pistolDamage;
      addWanted(world, 1, 'You shot a civilian!');
    } else if (best.kind === 'cop') {
      best.ref.health = (best.ref.health ?? 100) - PLAYER.pistolDamage;
      world.stats.damageDealt += PLAYER.pistolDamage;
      addWanted(world, 1, 'You shot a cop!');
      if (best.ref.health <= 0) {
        world.cops.splice(world.cops.indexOf(best.ref), 1);
        spark(world, best.ref.x, best.ref.y, '#e5534b', 14);
      }
    } else if (best.kind === 'car') {
      damageCar(world, best.ref, PLAYER.pistolDamage);
      addWanted(world, 0.5, 'Shots fired!');
    }
  } else {
    addWanted(world, 0.25, 'Shots fired!');
  }
}

// --- damage, particles -------------------------------------------------------
export function damageCar(world, car, amount) {
  car.health -= amount;
  spark(world, car.x, car.y, '#f2a03d', 8);
  if (car.health <= 0 && !car.wrecked) {
    car.wrecked = true;
    explode(world, car.x, car.y);
    if (car.isPlayer) {
      exitCar(world);
      world.player.health = Math.max(20, world.player.health - 30);
    }
  }
}

export function explode(world, x, y) {
  for (let i = 0; i < 26; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(60, 340);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: world.rng.range(0.4, 1.1), maxLife: 1.1,
      color: world.rng.pick(['#f2a03d', '#e5534b', '#f2c94c', '#5c5c5c']), size: world.rng.range(3, 8),
    });
  }
  world.camera.shake = Math.min(14, world.camera.shake + 9);
  addWanted(world, 0.5, 'An explosion rocked the block!');
}

export function spark(world, x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(40, 220);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: world.rng.range(0.15, 0.5), maxLife: 0.5, color, size: world.rng.range(2, 4),
    });
  }
}

// --- the police ---------------------------------------------------------------
function policeTargets(world) {
  const stars = Math.floor(world.wanted.stars);
  return {
    cars: WANTED.carsPerStar[stars] ?? 0,
    foot: WANTED.footPerStar[stars] ?? 0,
  };
}

function spawnPoliceCar(world) {
  const p = world.player;
  const spot = nearestRoadPoint(world.city, p.x + world.rng.range(-700, 700), p.y + world.rng.range(-700, 700));
  const angle = Math.atan2(p.y - spot.y, p.x - spot.x);
  const car = makeCar(2000 + Math.floor(world.rng.next() * 100000), spot.x, spot.y, angle, 'police', '#2e4a7a', true);
  car.isTraffic = false;
  car.speed = 0;
  world.cars.push(car);
  return car;
}

function spawnCop(world) {
  const p = world.player;
  const spot = nearestRoadPoint(world.city, p.x + world.rng.range(-400, 400), p.y + world.rng.range(-400, 400));
  world.cops.push({
    x: spot.x, y: spot.y, angle: 0, speed: 150,
    health: 100, shootCooldown: world.rng.range(0.5, 1.5),
  });
}

function updatePolice(world, dt) {
  const targets = policeTargets(world);
  const policeCars = world.cars.filter((c) => c.isPolice && !c.wrecked);
  if (policeCars.length < targets.cars && world.wanted.stars >= 1) spawnPoliceCar(world);
  if (world.cops.length < targets.foot && world.wanted.stars >= 1) spawnCop(world);
  // Cops on foot chase Mara; one who reaches her busts her, one close enough shoots.
  for (let i = world.cops.length - 1; i >= 0; i--) {
    const cop = world.cops[i];
    const d = Math.hypot(cop.x - world.player.x, cop.y - world.player.y);
    if (world.wanted.stars < 1 && d > 900) { world.cops.splice(i, 1); continue; }
    const angle = Math.atan2(world.player.y - cop.y, world.player.x - cop.x);
    cop.angle = angle;
    if (world.player.onFoot) {
      cop.x += Math.cos(angle) * cop.speed * dt;
      cop.y += Math.sin(angle) * cop.speed * dt;
      const fixed = slideOut(world.city, cop.x, cop.y, PED.radius);
      cop.x = fixed.x;
      cop.y = fixed.y;
      if (d < WANTED.bustRadius) {
        world.busted = true;
        return;
      }
      cop.shootCooldown -= dt;
      if (d < 320 && cop.shootCooldown <= 0) {
        cop.shootCooldown = 1.4;
        world.player.health -= 9;
        world.tracers.push({ x1: cop.x, y1: cop.y, x2: world.player.x, y2: world.player.y, life: 0.09 });
        spark(world, world.player.x, world.player.y, '#e5534b', 4);
        if (world.player.health <= 0) world.wasted = true;
      }
    } else {
      cop.x += Math.cos(angle) * cop.speed * 0.4 * dt;
      cop.y += Math.sin(angle) * cop.speed * 0.4 * dt;
    }
  }
  // Police cars hunt: steer at Mara, ram her car, slow near her.
  for (const car of policeCars) {
    const dx = world.player.x - car.x;
    const dy = world.player.y - car.y;
    const dist = Math.hypot(dx, dy);
    const want = Math.atan2(dy, dx);
    let diff = want - car.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.angle += Math.max(-CAR.turnRate * dt, Math.min(CAR.turnRate * dt, diff));
    const targetSpeed = dist > 120 ? CAR.maxSpeed * 0.95 : CAR.maxSpeed * 0.5;
    car.speed = Math.min(targetSpeed, car.speed + CAR.accel * dt);
    car.vx = Math.cos(car.angle) * car.speed;
    car.vy = Math.sin(car.angle) * car.speed;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    const fixed = slideOut(world.city, car.x, car.y, CAR.width / 2);
    car.x = fixed.x;
    car.y = fixed.y;
    if (dist < 46) {
      if (!world.player.onFoot) {
        const pc = world.cars.find((c) => c.id === world.player.carId);
        if (pc) damageCar(world, pc, WANTED.ramDamage * dt * 3);
      } else {
        world.player.health -= WANTED.ramDamage * dt * 2;
        if (world.player.health <= 0) world.wasted = true;
      }
    }
  }
  // A police car far away, or wrecked, is dropped.
  for (let i = world.cars.length - 1; i >= 0; i--) {
    const car = world.cars[i];
    if (!car.isPolice) continue;
    const d = Math.hypot(car.x - world.player.x, car.y - world.player.y);
    if (car.wrecked && d > 1200) world.cars.splice(i, 1);
    else if (!car.wrecked && world.wanted.stars < 1 && d > 1600) world.cars.splice(i, 1);
  }
}

// --- the helicopter ------------------------------------------------------------
function updateHelicopter(world, dt) {
  const h = world.heli;
  const want = world.wanted.stars >= WANTED.heliAtStars;
  if (want && !h.active) {
    h.active = true;
    h.x = world.player.x;
    h.y = world.player.y - 500;
    showMessage(world, 'A police helicopter is overhead!');
  } else if (!want && h.active) {
    h.active = false;
  }
  if (!h.active) return;
  h.rotor += dt * 22;
  const dx = world.player.x - h.x;
  const dy = world.player.y - h.y;
  const d = Math.hypot(dx, dy);
  const speed = Math.min(260, 120 + d * 0.4);
  h.x += (dx / (d || 1)) * speed * dt;
  h.y += (dy / (d || 1)) * speed * dt;
  h.angle = Math.atan2(dy, dx);
}

// --- traffic and pedestrians ---------------------------------------------------
function updateTraffic(world, dt) {
  for (const car of world.cars) {
    if (car.isPlayer || car.isPolice || car.wrecked || !car.isTraffic) continue;
    // Drive along the road it is on; off the road, steer back toward one.
    const aheadX = car.x + Math.cos(car.angle) * 40;
    const aheadY = car.y + Math.sin(car.angle) * 40;
    if (!onRoad(aheadX, aheadY)) {
      const spot = nearestRoadPoint(world.city, car.x, car.y);
      const want = Math.atan2(spot.y - car.y, spot.x - car.x);
      let diff = want - car.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      car.angle += Math.max(-2 * dt, Math.min(2 * dt, diff));
    }
    // Brake for the car ahead.
    let blocked = false;
    for (const other of world.cars) {
      if (other === car || other.wrecked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const along = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const across = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (along > 0 && along < 90 && across < 34) { blocked = true; break; }
    }
    const target = blocked ? 0 : CAR.trafficSpeed;
    car.speed += (target - car.speed) * Math.min(1, 1.6 * dt);
    car.vx = Math.cos(car.angle) * car.speed;
    car.vy = Math.sin(car.angle) * car.speed;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    const fixed = slideOut(world.city, car.x, car.y, CAR.width / 2);
    if (fixed.x !== car.x || fixed.y !== car.y) {
      car.x = fixed.x;
      car.y = fixed.y;
      car.angle += Math.PI / 2 * dt * 4;
    }
    // A traffic car that wanders off the map respawns on a road.
    if (car.x < 340 || car.x > WORLD_W - 40 || car.y < 40 || car.y > WORLD_H - 40) {
      const p = nearestRoadPoint(world.city, world.rng.range(600, WORLD_W - 200), world.rng.range(300, WORLD_H - 200));
      car.x = p.x;
      car.y = p.y;
      car.angle = world.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      car.speed = CAR.trafficSpeed;
    }
  }
}

function updatePeds(world, dt) {
  const p = world.player;
  for (const ped of world.peds) {
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    const danger = world.wanted.stars >= 1 && d < 420;
    if (danger && ped.state !== 'flee') {
      ped.state = 'flee';
      ped.tx = ped.x + (ped.x - p.x);
      ped.ty = ped.y + (ped.y - p.y);
    }
    if (ped.state === 'flee') {
      const angle = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
      ped.x += Math.cos(angle) * PED.fleeSpeed * dt;
      ped.y += Math.sin(angle) * PED.fleeSpeed * dt;
      if (Math.hypot(ped.tx - ped.x, ped.ty - ped.y) < 30 || d > 700) ped.state = 'walk';
    } else {
      ped.wait -= dt;
      if (ped.wait <= 0) {
        const spot = nearestRoadPoint(world.city, ped.x + world.rng.range(-260, 260), ped.y + world.rng.range(-260, 260));
        ped.tx = spot.x + world.rng.range(-40, 40);
        ped.ty = spot.y + world.rng.range(-40, 40);
        ped.wait = world.rng.range(2, 6);
      }
      const dx = ped.tx - ped.x;
      const dy = ped.ty - ped.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 8) {
        ped.angle = Math.atan2(dy, dx);
        ped.x += (dx / dist) * ped.speed * dt;
        ped.y += (dy / dist) * ped.speed * dt;
      }
    }
    const fixed = slideOut(world.city, ped.x, ped.y, PED.radius);
    ped.x = fixed.x;
    ped.y = fixed.y;
  }
}

// --- the player ------------------------------------------------------------------
function updatePlayer(world, input, dt) {
  const p = world.player;
  if (p.onFoot) {
    const dir = input.direction();
    const running = input.run();
    const speed = running ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const len = Math.hypot(dir.x, dir.y);
    p.moving = len > 0;
    if (len > 0) {
      p.vx = (dir.x / len) * speed;
      p.vy = (dir.y / len) * speed;
      p.angle = Math.atan2(dir.y, dir.x);
    } else {
      p.vx = 0;
      p.vy = 0;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    const fixed = slideOut(world.city, p.x, p.y, PLAYER.radius);
    p.x = fixed.x;
    p.y = fixed.y;
    p.speed = len > 0 ? speed : 0;
    // A car that hits Mara on foot hurts her.
    for (const car of world.cars) {
      if (car.wrecked) continue;
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < 34 && Math.abs(car.speed) > 60) {
        p.health -= 12 * dt * 4;
        if (p.health <= 0) world.wasted = true;
      }
    }
    if (input.takeEnter()) {
      const car = nearestCar(world, p.x, p.y, 70);
      if (car) enterCar(world, car);
    }
    // Shooting: a click fires once (even a very quick one), holding the
    // button fires again after the cooldown. The aim is the mouse position
    // in the world.
    if (input.takeClick() || input.mouseDown()) {
      const aim = input.mouseWorld(world.camera);
      playerShoot(world, aim.x, aim.y);
    }
  } else {
    const car = world.cars.find((c) => c.id === p.carId);
    if (!car) { p.onFoot = true; p.carId = null; return; }
    const throttle = input.up() ? 1 : input.down() ? -0.6 : 0;
    const steer = (input.left() ? -1 : 0) + (input.right() ? 1 : 0);
    const braking = input.brake();
    const forward = Math.cos(car.angle);
    const right = Math.sin(car.angle);
    const speedAlong = car.vx * forward + car.vy * right;
    const speedSide = -car.vx * right + car.vy * forward;
    let accel = 0;
    if (throttle > 0) accel = CAR.accel;
    else if (throttle < 0) accel = speedAlong > 0 ? -CAR.brake : CAR.reverseAccel;
    if (braking) accel = speedAlong > 0 ? -CAR.brake : speedAlong < 0 ? CAR.brake : 0;
    let newAlong = speedAlong + accel * dt;
    newAlong = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, newAlong));
    if (throttle === 0 && !braking) newAlong *= Math.max(0, 1 - 0.9 * dt);
    const newSide = speedSide * Math.pow(CAR.grip, dt * 60);
    const turn = steer * CAR.turnRate * Math.min(1, Math.abs(newAlong) / 140) * (newAlong < 0 ? -1 : 1);
    car.angle += turn * dt;
    car.vx = Math.cos(car.angle) * newAlong - Math.sin(car.angle) * newSide;
    car.vy = Math.sin(car.angle) * newAlong + Math.cos(car.angle) * newSide;
    car.x += car.vx * dt;
    car.y += car.vy * dt;
    const fixed = slideOut(world.city, car.x, car.y, CAR.width / 2);
    if (fixed.x !== car.x || fixed.y !== car.y) {
      const lost = Math.abs(newAlong) * 0.45;
      car.vx *= 0.3;
      car.vy *= 0.3;
      if (lost > 90) {
        damageCar(world, car, lost * 0.08);
        spark(world, car.x, car.y, '#f2a03d', 5);
      }
      car.x = fixed.x;
      car.y = fixed.y;
    }
    car.speed = Math.hypot(car.vx, car.vy);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    p.moving = car.speed > 20;
    if (car.health < 45 && world.rng.chance(0.3)) {
      world.particles.push({
        x: car.x + world.rng.range(-10, 10), y: car.y + world.rng.range(-10, 10),
        vx: world.rng.range(-20, 20), vy: world.rng.range(-50, -10),
        life: 0.8, maxLife: 0.8, color: '#5c5c5c', size: world.rng.range(4, 8),
      });
    }
    if (input.takeEnter()) exitCar(world);
    // Running over a pedestrian while driving is a crime.
    for (const ped of world.peds) {
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 30 && car.speed > 80) {
        ped.state = 'flee';
        addWanted(world, 1, 'You ran someone over!');
        spark(world, ped.x, ped.y, '#e5534b', 6);
      }
    }
  }
  // Health comes back slowly when nothing is happening.
  if (world.wanted.stars < 1 && p.health > 0 && p.health < PLAYER.health) {
    p.health = Math.min(PLAYER.health, p.health + 2.5 * dt);
  }
}

// --- the wanted level's slow fall --------------------------------------------------
function updateWanted(world, dt) {
  const w = world.wanted;
  if (w.stars <= 0) return;
  w.timer += dt;
  if (w.timer > WANTED.decayDelay) {
    w.cooling = true;
    w.stars = Math.max(0, w.stars - WANTED.decayRate * dt);
  }
}

// --- the camera ----------------------------------------------------------------------
function updateCamera(world, dt) {
  const p = world.player;
  const cam = world.camera;
  cam.x += (p.x - cam.x) * Math.min(1, CAMERA.lerp * dt);
  cam.y += (p.y - cam.y) * Math.min(1, CAMERA.lerp * dt);
  const targetZoom = p.onFoot ? CAMERA.zoomFoot : CAMERA.zoomCar;
  cam.zoom += (targetZoom - cam.zoom) * Math.min(1, 2 * dt);
  cam.shake = Math.max(0, cam.shake - CAMERA.shakeDecay * dt);
}

// --- the whole step --------------------------------------------------------------------
export function updateWorld(world, input, dt) {
  world.time += dt;
  if (world.messageTimer > 0) {
    world.messageTimer -= dt;
    if (world.messageTimer <= 0) world.message = '';
  }
  updatePlayer(world, input, dt);
  updateTraffic(world, dt);
  updatePeds(world, dt);
  updatePolice(world, dt);
  updateHelicopter(world, dt);
  updateWanted(world, dt);
  updateMissions(world, dt);
  updateCamera(world, dt);
  // Particles and tracers fade.
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.life -= dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= 0.98;
    pt.vy *= 0.98;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.tracers.length - 1; i >= 0; i--) {
    world.tracers[i].life -= dt;
    if (world.tracers[i].life <= 0) world.tracers.splice(i, 1);
  }
  if (world.player.health <= 0) world.wasted = true;
  return (world.busted ? EVENT_BUSTED : 0) | (world.wasted ? EVENT_WASTED : 0);
}

// Where the player is, for the minimap and the district label.
export function playerDistrict(world) {
  return districtAt(world.player.x, world.player.y).name;
}
