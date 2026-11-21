// The simulation: Mara, her cars, traffic, pedestrians, the police, the
// helicopter, combat, the wanted level and the missions. No drawing here;
// render.js reads this state and draws it.

import {
  WORLD_W, WORLD_H, ROAD_XS, ROAD_YS, PLAYER, CAR,
  TRAFFIC_COUNT, TRAFFIC_SPEED, PED_COUNT, COP_FOOT_SPEED, COP_BUST_DIST,
  POLICE_CAR_SPEED, HELI_SPEED, WANTED_COOL, CAR_COLORS, PED_COLORS,
  PLACES,
} from './config.js';
import { districtAt, hitsBuilding, randomRoadPoint } from './city.js';
import { currentMission, updateMission, stageStarted, MISSIONS } from './missions.js';
import { writeSave } from './save.js';

let nextCarId = 1;

// Math.random shaped like the seeded RNG, for runtime spawning.
const mathRng = {
  chance: (p) => Math.random() < p,
  pick: (arr) => arr[Math.floor(Math.random() * arr.length)],
  range: (lo, hi) => lo + Math.random() * (hi - lo),
  int: (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1)),
  next: () => Math.random(),
};

function angleOf(axis, dir) {
  if (axis === 'x') return dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  return dir === 1 ? 0 : Math.PI;
}

/** Lane offset: right-hand traffic, 14 units off the centreline. */
function laneOffset(axis, dir) {
  if (axis === 'x') return dir === 1 ? -14 : 14;
  return dir === 1 ? 14 : -14;
}

function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Move a circle with building collision, sliding along walls. */
function moveBody(world, e, dx, dy, r) {
  const nx = e.x + dx;
  if (!hitsBuilding(world.city, nx, e.y, r)) e.x = nx;
  const ny = e.y + dy;
  if (!hitsBuilding(world.city, e.x, ny, r)) e.y = ny;
  e.x = clamp(e.x, r, WORLD_W - r);
  e.y = clamp(e.y, r, WORLD_H - r);
}

function spawnParticles(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = speed * (0.4 + Math.random() * 0.8);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: 0.5 + Math.random() * 0.4, maxLife: 0.9, color, size: 2 + Math.random() * 3,
    });
  }
}

function addTracer(world, x1, y1, x2, y2) {
  world.tracers.push({ x1, y1, x2, y2, life: 0.09, maxLife: 0.09 });
}

function raiseWanted(world, stars) {
  if (stars > world.wanted) world.wanted = Math.min(5, stars);
  world.coolT = 0;
}

function makeCar(world, kind, x, y, angle, color, speed) {
  const car = {
    id: nextCarId++, kind, x, y, angle, speed: speed || 0, color,
    hp: CAR.hp, wrecked: false, roadAxis: 'y', roadLine: 200, dir: 1,
    turnT: 0,
  };
  // Snap the road state to the spawn angle.
  const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  if (Math.abs(a - Math.PI / 2) < 0.1 || Math.abs(a + Math.PI / 2) < 0.1 || Math.abs(a - (3 * Math.PI) / 2) < 0.1) {
    car.roadAxis = 'x';
    car.dir = a < Math.PI ? 1 : -1;
    car.roadLine = ROAD_XS.reduce((best, v) => (Math.abs(v - x) < Math.abs(best - x) ? v : best), ROAD_XS[0]);
  } else {
    car.roadAxis = 'y';
    car.dir = a < Math.PI / 2 || a > (3 * Math.PI) / 2 ? 1 : -1;
    car.roadLine = ROAD_YS.reduce((best, v) => (Math.abs(v - y) < Math.abs(best - y) ? v : best), ROAD_YS[0]);
  }
  return car;
}

function spawnTraffic(world) {
  while (world.cars.filter((c) => c.kind === 'traffic').length < TRAFFIC_COUNT) {
    const pt = randomRoadPoint(mathRng);
    const car = makeCar(world, 'traffic', pt.x, pt.y, pt.angle, mathRng.pick(CAR_COLORS), TRAFFIC_SPEED);
    // Keep it away from Mara's start so the first seconds are calm.
    if (dist(car.x, car.y, world.player.x, world.player.y) < 260) continue;
    world.cars.push(car);
  }
}

function spawnPeds(world) {
  while (world.peds.length < PED_COUNT) {
    const x = 220 + Math.random() * (WORLD_W - 240);
    const y = 20 + Math.random() * (WORLD_H - 40);
    if (dist(x, y, world.player.x, world.player.y) < 200) continue;
    world.peds.push({
      x, y, angle: Math.random() * Math.PI * 2, speed: 45 + Math.random() * 25,
      color: mathRng.pick(PED_COLORS), flee: 0, fx: 0, fy: 0,
    });
  }
}

function nearestRoadSpawn(world, minD) {
  for (let tries = 0; tries < 12; tries++) {
    const pt = randomRoadPoint(mathRng);
    if (dist(pt.x, pt.y, world.player.x, world.player.y) >= minD) return pt;
  }
  const pt = randomRoadPoint(mathRng);
  return pt;
}

function spawnFootCop(world) {
  const pt = nearestRoadSpawn(world, 320);
  const cop = { x: pt.x, y: pt.y, hp: 2, speed: COP_FOOT_SPEED, angle: 0 };
  world.cops.push(cop);
}

function spawnPoliceCar(world) {
  const pt = nearestRoadSpawn(world, 380);
  const car = makeCar(world, 'police', pt.x, pt.y, pt.angle, '#1c2f4a', POLICE_CAR_SPEED);
  car.hp = CAR.hp;
  world.cars.push(car);
}

function spawnHeli(world) {
  if (world.heli) return;
  world.heli = { x: world.player.x + 260, y: world.player.y - 260 };
}

function explodeCar(world, car) {
  car.wrecked = true;
  car.speed = 0;
  spawnParticles(world, car.x, car.y, '#ff8a2e', 26, 260);
  spawnParticles(world, car.x, car.y, '#3a3a3a', 18, 120);
  spawnParticles(world, car.x, car.y, '#ffd23a', 12, 180);
  world.shake = Math.max(world.shake, 13);
  raiseWanted(world, 2);
}

function damageCar(world, car, dmg) {
  if (car.wrecked) return;
  car.hp -= dmg;
  if (car.hp <= 0) explodeCar(world, car);
}

function bustPlayer(world) {
  if (world.state !== 'playing') return;
  world.state = 'busted';
  const lost = Math.min(world.cash, 150);
  world.cash -= lost;
  world.bustedLost = lost;
  world.wanted = 0;
  world.heat = 0;
  world.coolT = 0;
  world.cops = [];
  world.cars = world.cars.filter((c) => c.kind === 'traffic');
  world.heli = null;
}

function wastePlayer(world) {
  if (world.state !== 'playing') return;
  world.state = 'wasted';
  const lost = Math.min(world.cash, 100);
  world.cash -= lost;
  world.wastedLost = lost;
  world.wanted = 0;
  world.heat = 0;
  world.coolT = 0;
  world.cops = [];
  world.cars = world.cars.filter((c) => c.kind === 'traffic');
  world.heli = null;
}

function respawn(world) {
  const p = world.player;
  p.x = PLACES.safehouse.x;
  p.y = PLACES.safehouse.y + 60;
  p.hp = PLAYER.hp;
  p.ammo = PLAYER.ammoMax;
  p.reloadT = 0;
  p.car = null;
  p.hurtT = 0;
  world.camera.x = clamp(p.x - 640, 0, Math.max(0, WORLD_W - 1280));
  world.camera.y = clamp(p.y - 360, 0, Math.max(0, WORLD_H - 720));
  saveWorld(world);
}

function saveWorld(world) {
  writeSave({
    cash: world.cash,
    rep: world.rep,
    bestCash: world.bestCash,
    missionIndex: world.missionIndex,
  });
}

export function createWorld(city, save) {
  const world = {
    city,
    time: 0,
    state: 'start',
    frozen: false,
    player: {
      x: 500, y: 1000, angle: 0, hp: PLAYER.hp,
      ammo: PLAYER.ammoMax, reloadT: 0, car: null, hurtT: 0,
    },
    cars: [],
    peds: [],
    cops: [],
    guards: [],
    guardsDefeated: 0,
    guardsSpawned: 0,
    heli: null,
    wanted: 0,
    heat: 0,
    coolT: 0,
    cash: save && typeof save.cash === 'number' ? save.cash : 250,
    rep: save && save.rep ? save.rep : { marina: 0, palmera: 0, neon: 0, calle: 0, dockside: 0 },
    bestCash: save && typeof save.bestCash === 'number' ? save.bestCash : 250,
    missionIndex: save && typeof save.missionIndex === 'number' ? save.missionIndex : 0,
    missionStage: 0,
    missionMaxHeat: 0,
    storyDone: false,
    lastRating: null,
    lastReward: 0,
    bustedLost: 0,
    wastedLost: 0,
    camera: { x: 0, y: 0 },
    shake: 0,
    particles: [],
    tracers: [],
    toast: null,
    shotsFired: 0,
    saveT: 0,
  };
  for (const id of ['marina', 'palmera', 'neon', 'calle', 'dockside']) {
    if (typeof world.rep[id] !== 'number') world.rep[id] = 0;
  }
  if (world.missionIndex >= MISSIONS.length) world.missionIndex = MISSIONS.length;
  spawnTraffic(world);
  spawnPeds(world);
  const m = currentMission(world);
  if (m) stageStarted(world, m, 0);
  world.camera.x = clamp(world.player.x - 640, 0, Math.max(0, WORLD_W - 1280));
  world.camera.y = clamp(world.player.y - 360, 0, Math.max(0, WORLD_H - 720));
  return world;
}

// --- shooting ---------------------------------------------------------------

function rayHit(world, ox, oy, dx, dy, range) {
  let best = null;
  let bestT = range;
  const test = (x, y, r, ref) => {
    const cx = x - ox;
    const cy = y - oy;
    const t = cx * dx + cy * dy;
    if (t < 0 || t > bestT) return;
    const px = ox + dx * t;
    const py = oy + dy * t;
    const ddx = x - px;
    const ddy = y - py;
    if (ddx * ddx + ddy * ddy < r * r) {
      bestT = t;
      best = ref;
    }
  };
  for (const c of world.cops) test(c.x, c.y, 14, { type: 'cop', ref: c });
  for (const g of world.guards) test(g.x, g.y, 14, { type: 'guard', ref: g });
  for (const p of world.peds) test(p.x, p.y, 12, { type: 'ped', ref: p });
  for (const car of world.cars) {
    if (car.wrecked) continue;
    if (car === world.player.car) continue;
    test(car.x, car.y, CAR.radius + 6, { type: 'car', ref: car });
  }
  return best ? { hit: best, t: bestT } : null;
}

function playerShoot(world, audio, mx, my) {
  const p = world.player;
  if (p.ammo <= 0) return;
  const ox = p.car ? p.car.x : p.x;
  const oy = p.car ? p.car.y : p.y;
  const dx = mx - ox;
  const dy = my - oy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  p.ammo -= 1;
  p.reloadT = 0;
  world.shotsFired += 1;
  world.shake = Math.max(world.shake, 3);
  audio.gunshot();
  raiseWanted(world, 1);
  const res = rayHit(world, ox, oy, ux, uy, PLAYER.gunRange);
  const hx = ox + ux * (res ? res.t : PLAYER.gunRange);
  const hy = oy + uy * (res ? res.t : PLAYER.gunRange);
  addTracer(world, ox, oy, hx, hy);
  if (!res) return;
  spawnParticles(world, hx, hy, '#ffd23a', 8, 160);
  if (res.hit.type === 'ped') {
    const idx = world.peds.indexOf(res.hit.ref);
    if (idx >= 0) world.peds.splice(idx, 1);
    spawnParticles(world, hx, hy, '#c03a3a', 12, 140);
    raiseWanted(world, 2);
  } else if (res.hit.type === 'cop') {
    const cop = res.hit.ref;
    cop.hp -= 1;
    spawnParticles(world, hx, hy, '#3a6ad8', 10, 150);
    if (cop.hp <= 0) {
      const idx = world.cops.indexOf(cop);
      if (idx >= 0) world.cops.splice(idx, 1);
      spawnParticles(world, hx, hy, '#3a6ad8', 14, 180);
      raiseWanted(world, 3);
    }
  } else if (res.hit.type === 'guard') {
    const g = res.hit.ref;
    g.hp -= 1;
    spawnParticles(world, hx, hy, '#c03a3a', 10, 150);
    if (g.hp <= 0) {
      const idx = world.guards.indexOf(g);
      if (idx >= 0) world.guards.splice(idx, 1);
      world.guardsDefeated += 1;
      spawnParticles(world, hx, hy, '#c03a3a', 14, 180);
      raiseWanted(world, 2);
    }
  } else if (res.hit.type === 'car') {
    damageCar(world, res.hit.ref, 18);
  }
}

// --- the update -------------------------------------------------------------

export function updateWorld(world, input, audio, dt, viewport) {
  if (world.frozen) return;
  dt = Math.min(dt, 0.05);
  world.time += dt;

  // Screens: Enter starts, P pauses, Enter continues.
  if (world.state === 'start') {
    audio.setEngine(0, false);
    audio.setSiren(false);
    if (input.takePressed('Enter')) {
      world.state = 'playing';
      input.clearPressed();
      audio.unlock();
    }
    return;
  }
  if (world.state === 'paused') {
    if (input.takePressed('KeyP') || input.takePressed('Enter')) {
      world.state = 'playing';
      input.clearPressed();
    }
    audio.setEngine(0, false);
    audio.setSiren(false);
    return;
  }
  if (world.state === 'busted' || world.state === 'wasted') {
    if (input.takePressed('Enter')) {
      respawn(world);
      world.state = 'playing';
      input.clearPressed();
    }
    return;
  }
  if (world.state === 'done') {
    if (input.takePressed('Enter')) {
      world.state = 'playing';
      input.clearPressed();
    }
    return;
  }

  const p = world.player;
  const mv = input.move();
  const mlen = Math.sqrt(mv.x * mv.x + mv.y * mv.y);
  const nx = mlen > 0 ? mv.x / mlen : 0;
  const ny = mlen > 0 ? mv.y / mlen : 0;

  if (input.takePressed('KeyP')) {
    world.state = 'paused';
    input.clearPressed();
    return;
  }
  if (input.takePressed('KeyM')) audio.toggleMute();
  if (input.takePressed('KeyR')) {
    p.ammo = PLAYER.ammoMax;
    p.reloadT = 0;
  }

  // Aim: the mouse, in world coordinates.
  const camX = world.camera.x + (world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0);
  const camY = world.camera.y + (world.shake > 0 ? (Math.random() - 0.5) * world.shake : 0);
  const mouseWX = camX + input.mouse.x;
  const mouseWY = camY + input.mouse.y;
  p.angle = Math.atan2(mouseWY - p.y, mouseWX - p.x);

  // Enter / exit a car.
  if (input.takePressed('KeyE')) {
    if (p.car) {
      const car = p.car;
      p.car = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      if (hitsBuilding(world.city, p.x, p.y, PLAYER.radius)) {
        p.x = car.x + Math.cos(car.angle - Math.PI / 2) * 34;
        p.y = car.y + Math.sin(car.angle - Math.PI / 2) * 34;
      }
      p.angle = car.angle;
    } else {
      let bestCar = null;
      let bestD = 46;
      for (const car of world.cars) {
        if (car.wrecked) continue;
        const d = dist(p.x, p.y, car.x, car.y);
        if (d < bestD) { bestD = d; bestCar = car; }
      }
      if (bestCar) {
        p.car = bestCar;
        bestCar.kind = 'player';
        // Stealing in front of a witness draws the law.
        let witness = false;
        for (const cop of world.cops) if (dist(p.x, p.y, cop.x, cop.y) < 420) witness = true;
        for (const ped of world.peds) if (dist(p.x, p.y, ped.x, ped.y) < 220) witness = true;
        if (witness) raiseWanted(world, 1);
        audio.unlock();
      }
    }
  }

  // Shooting.
  const click = input.takeClick();
  if (click) {
    const wx = camX + click.x;
    const wy = camY + click.y;
    playerShoot(world, audio, wx, wy);
    audio.unlock();
  }
  if (p.ammo < PLAYER.ammoMax) {
    p.reloadT += dt;
    if (p.reloadT >= PLAYER.reloadDelay) {
      p.ammo = PLAYER.ammoMax;
      p.reloadT = 0;
    }
  }

  // --- Mara herself ---
  if (!p.car) {
    const speed = input.run() ? PLAYER.run : PLAYER.walk;
    moveBody(world, p, nx * speed * dt, ny * speed * dt, PLAYER.radius);
    if (p.hurtT > 0) p.hurtT -= dt;
    if (p.hurtT <= 0 && p.hp < PLAYER.hp) {
      // Quiet for a while: slowly patch up.
      p.hp = Math.min(PLAYER.hp, p.hp + 6 * dt);
    }
  } else {
    const car = p.car;
    const fwd = input.isDown('KeyW') || input.isDown('ArrowUp');
    const back = input.isDown('KeyS') || input.isDown('ArrowDown');
    const left = input.isDown('KeyA') || input.isDown('ArrowLeft');
    const right = input.isDown('KeyD') || input.isDown('ArrowRight');
    const brake = input.isDown('Space');
    if (fwd) car.speed = Math.min(CAR.maxSpeed, car.speed + CAR.accel * dt);
    else if (back) {
      if (car.speed > 0) car.speed = Math.max(0, car.speed - CAR.brake * dt);
      else car.speed = Math.max(-CAR.maxReverse, car.speed - CAR.reverseAccel * dt);
    } else {
      const drag = 160 * dt;
      if (car.speed > 0) car.speed = Math.max(0, car.speed - drag);
      else car.speed = Math.min(0, car.speed + drag);
    }
    if (brake) {
      car.speed *= Math.max(0, 1 - 4 * dt);
      if (Math.abs(car.speed) < 4) car.speed = 0;
    }
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    const grip = brake ? 1.6 : 1;
    const turnRate = CAR.turn * grip * clamp(car.speed / 130, -1, 1);
    car.angle += steer * turnRate * dt;
    const ox = car.x;
    const oy = car.y;
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;
    if (hitsBuilding(world.city, car.x, car.y, CAR.radius)) {
      car.x = ox;
      car.y = oy;
      car.speed *= -0.25;
      spawnParticles(world, car.x, car.y, '#c8c8c8', 4, 90);
    }
    car.x = clamp(car.x, CAR.radius, WORLD_W - CAR.radius);
    car.y = clamp(car.y, CAR.radius, WORLD_H - CAR.radius);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
  }

  // --- traffic and police cars, on the roads ---
  for (const car of world.cars) {
    if (car.wrecked) continue;
    if (car === p.car) continue;
    const isPolice = car.kind === 'police';
    const targetSpeed = isPolice ? POLICE_CAR_SPEED : TRAFFIC_SPEED;
    // Slow for the car ahead.
    let blocked = false;
    const fx = Math.cos(car.angle);
    const fy = Math.sin(car.angle);
    for (const other of world.cars) {
      if (other === car || other.wrecked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * fx + dy * fy;
      const side = Math.abs(-dx * fy + dy * fx);
      if (ahead > 0 && ahead < 58 && side < 26) { blocked = true; break; }
    }
    if (blocked) car.speed = Math.max(0, car.speed - 320 * dt);
    else car.speed = Math.min(targetSpeed, car.speed + 200 * dt);

    // Lane: stay on the centreline's right side.
    if (car.roadAxis === 'x') {
      car.x = car.roadLine + laneOffset('x', car.dir);
      car.y += car.dir * car.speed * dt;
    } else {
      car.y = car.roadLine + laneOffset('y', car.dir);
      car.x += car.dir * car.speed * dt;
    }
    car.angle = angleOf(car.roadAxis, car.dir);

    // Map edge: turn around rather than leave the grid.
    if (car.roadAxis === 'y' && (car.x <= 215 || car.x >= WORLD_W - 15)) car.dir *= -1;
    if (car.roadAxis === 'x' && (car.y <= 15 || car.y >= WORLD_H - 15)) car.dir *= -1;

    // Intersections: turn or go straight.
    const cross = car.roadAxis === 'x'
      ? ROAD_YS.find((v) => (car.dir === 1 ? v > car.y - 2 && v <= car.y + 2 : v < car.y + 2 && v >= car.y - 2))
      : ROAD_XS.find((v) => (car.dir === 1 ? v > car.x - 2 && v <= car.x + 2 : v < car.x + 2 && v >= car.x - 2));
    if (cross !== undefined) {
      const ix = car.roadAxis === 'x' ? car.roadLine : cross;
      const iy = car.roadAxis === 'x' ? cross : car.roadLine;
      // Options: straight, left, right. Left/right turn onto the crossing road.
      const heading = angleOf(car.roadAxis, car.dir);
      const options = [{ axis: car.roadAxis, line: car.roadLine, dir: car.dir, score: 0 }];
      for (const turn of [-Math.PI / 2, Math.PI / 2]) {
        const na = heading + turn;
        let n = Math.round(na / (Math.PI / 2)) % 4;
        if (n < 0) n += 4;
        let axis;
        let line;
        let dir;
        if (n === 0) { axis = 'y'; line = iy; dir = 1; }
        else if (n === 1) { axis = 'x'; line = ix; dir = 1; }
        else if (n === 2) { axis = 'y'; line = iy; dir = -1; }
        else { axis = 'x'; line = ix; dir = -1; }
        // Never turn into the bay (west of x=200).
        if (axis === 'y' && dir === -1 && ix <= 210) continue;
        options.push({ axis, line, dir, score: 0 });
      }
      let pick = options[0];
      if (isPolice) {
        // Greedy: the turn that points most at Mara.
        let bestScore = -Infinity;
        for (const o of options) {
          const a = angleOf(o.axis, o.dir);
          const dx = p.x - car.x;
          const dy = p.y - car.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const score = (dx / len) * Math.cos(a) + (dy / len) * Math.sin(a);
          if (score > bestScore) { bestScore = score; pick = o; }
        }
      } else if (options.length > 1 && Math.random() < 0.3) {
        pick = options[1 + Math.floor(Math.random() * (options.length - 1))];
      }
      if (pick.axis !== car.roadAxis || pick.line !== car.roadLine || pick.dir !== car.dir) {
        car.roadAxis = pick.axis;
        car.roadLine = pick.line;
        car.dir = pick.dir;
        if (car.roadAxis === 'x') { car.x = car.roadLine + laneOffset('x', car.dir); car.y = iy; }
        else { car.y = car.roadLine + laneOffset('y', car.dir); car.x = ix; }
        car.angle = angleOf(car.roadAxis, car.dir);
      }
    }
  }

  // Car-car bumps: push apart, trade a little speed.
  for (let i = 0; i < world.cars.length; i++) {
    for (let j = i + 1; j < world.cars.length; j++) {
      const a = world.cars[i];
      const b = world.cars[j];
      if (a.wrecked || b.wrecked) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const min = CAR.radius * 2 + 4;
      if (d > 0 && d < min) {
        const push = (min - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        a.x -= ux * push;
        a.y -= uy * push;
        b.x += ux * push;
        b.y += uy * push;
        // A police ram hurts Mara's car.
        if ((a.kind === 'police' && b === p.car) || (b.kind === 'police' && a === p.car)) {
          const pc = p.car;
          damageCar(world, pc, 6);
          world.shake = Math.max(world.shake, 5);
        }
        a.speed *= 0.7;
        b.speed *= 0.7;
      }
    }
  }

  // A wrecked player car strands Mara on foot.
  if (p.car && p.car.wrecked) {
    p.x = p.car.x + 30;
    p.y = p.car.y + 30;
    p.car = null;
  }

  // --- pedestrians ---
  for (const ped of world.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      moveBody(world, ped, ped.fx * 150 * dt, ped.fy * 150 * dt, 11);
      continue;
    }
    const nx2 = Math.cos(ped.angle) * ped.speed * dt;
    const ny2 = Math.sin(ped.angle) * ped.speed * dt;
    const ox = ped.x;
    const oy = ped.y;
    moveBody(world, ped, nx2, ny2, 11);
    if (ped.x === ox && ped.y === oy && Math.random() < 0.02) {
      ped.angle = Math.random() * Math.PI * 2;
    }
    if (Math.random() < 0.002) ped.angle += (Math.random() - 0.5) * 1.2;
    // Crossed into the bay? Walk back east.
    if (ped.x < 210) ped.angle = 0;
  }
  spawnPeds(world);

  // --- foot cops ---
  const wantCops = world.wanted >= 1 ? Math.min(3, world.wanted) : 0;
  while (world.cops.length < wantCops) spawnFootCop(world);
  for (const cop of world.cops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    cop.angle = Math.atan2(dy, dx);
    moveBody(world, cop, (dx / d) * COP_FOOT_SPEED * dt, (dy / d) * COP_FOOT_SPEED * dt, 12);
    if (!p.car && d < COP_BUST_DIST) bustPlayer(world);
  }

  // --- police cars: a ram on foot is a bust ---
  for (const car of world.cars) {
    if (car.kind !== 'police' || car.wrecked) continue;
    if (!p.car && dist(p.x, p.y, car.x, car.y) < 30) bustPlayer(world);
  }

  // --- armed guards (mission 3) ---
  for (const g of world.guards) {
    const dx = p.x - g.x;
    const dy = p.y - g.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    g.angle = Math.atan2(dy, dx);
    g.shootT -= dt;
    if (d < 430 && g.shootT <= 0) {
      g.shootT = 1.1 + Math.random() * 0.5;
      addTracer(world, g.x, g.y, p.x, p.y);
      audio.gunshot();
      const hitChance = clamp(0.55 - d / 900, 0.12, 0.55);
      if (Math.random() < hitChance && !p.car) {
        p.hp -= 9;
        p.hurtT = 2;
        world.shake = Math.max(world.shake, 4);
        spawnParticles(world, p.x, p.y, '#c03a3a', 6, 120);
        if (p.hp <= 0) wastePlayer(world);
      }
    }
    // Guards hold their ground; they shuffle toward Mara when she is close.
    if (d < 200 && d > 60) {
      moveBody(world, g, (dx / d) * 60 * dt, (dy / d) * 60 * dt, 12);
    }
  }

  // --- helicopter (3+ stars): follows Mara, blocks the cooldown ---
  if (world.wanted >= 3) {
    spawnHeli(world);
    const h = world.heli;
    const tx = p.x + 110;
    const ty = p.y - 110;
    const dx = tx - h.x;
    const dy = ty - h.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const step = Math.min(d, HELI_SPEED * dt);
    h.x += (dx / d) * step;
    h.y += (dy / d) * step;
  } else if (world.heli) {
    world.heli = null;
  }

  // --- wanted: numbers, cooldown, police strength ---
  const wantCars = world.wanted >= 2 ? Math.min(4, world.wanted - 1) : 0;
  const policeCars = world.cars.filter((c) => c.kind === 'police' && !c.wrecked).length;
  while (policeCars < wantCars) {
    spawnPoliceCar(world);
    if (world.cars.filter((c) => c.kind === 'police' && !c.wrecked).length >= wantCars) break;
  }
  if (world.wanted === 0) {
    world.cops = [];
    world.cars = world.cars.filter((c) => c.kind !== 'police');
    world.heli = null;
  }
  const nearPolice = world.cops.some((c) => dist(p.x, p.y, c.x, c.y) < 260)
    || world.cars.some((c) => c.kind === 'police' && !c.wrecked && dist(p.x, p.y, c.x, c.y) < 300)
    || world.heli !== null;
  if (world.wanted > 0 && !nearPolice) {
    world.coolT += dt;
    if (world.coolT >= WANTED_COOL) {
      world.wanted -= 1;
      world.coolT = 0;
    }
  } else {
    world.coolT = 0;
  }

  // --- missions ---
  const ev = updateMission(world);
  if (ev) {
    audio.jingle();
    saveWorld(world);
    if (ev.type === 'storyDone') world.state = 'done';
  }

  // --- particles, tracers, shake, toast ---
  for (let i = world.particles.length - 1; i >= 0; i--) {
    const pt = world.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.vx *= Math.max(0, 1 - 3 * dt);
    pt.vy *= Math.max(0, 1 - 3 * dt);
    pt.life -= dt;
    if (pt.life <= 0) world.particles.splice(i, 1);
  }
  for (let i = world.tracers.length - 1; i >= 0; i--) {
    world.tracers[i].life -= dt;
    if (world.tracers[i].life <= 0) world.tracers.splice(i, 1);
  }
  if (world.shake > 0) world.shake = Math.max(0, world.shake - 34 * dt);
  if (world.toast) {
    world.toast.t -= dt;
    if (world.toast.t <= 0) world.toast = null;
  }

  // --- camera follows Mara ---
  const vw = viewport ? viewport.w : 1280;
  const vh = viewport ? viewport.h : 720;
  const focusX = p.car ? p.car.x : p.x;
  const focusY = p.car ? p.car.y : p.y;
  world.camera.x = clamp(focusX - vw / 2, 0, Math.max(0, WORLD_W - vw));
  world.camera.y = clamp(focusY - vh / 2, 0, Math.max(0, WORLD_H - vh));

  // --- sound follows the chase ---
  const driving = p.car !== null;
  const speed01 = driving ? Math.abs(p.car.speed) / 335 : 0;
  audio.setEngine(speed01, driving);
  audio.setSiren(world.wanted > 0 && nearPolice);

  // --- autosave now and then ---
  world.saveT += dt;
  if (world.saveT > 10) {
    world.saveT = 0;
    saveWorld(world);
  }
}

/** The district Mara stands in, for the HUD and the minimap label. */
export function playerDistrict(world) {
  const p = world.player;
  return districtAt(p.x, p.y);
}
