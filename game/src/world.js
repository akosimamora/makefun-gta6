// World simulation: the player (on foot or in a car), AI traffic,
// pedestrians, police (foot cops, patrol cars, helicopter), bullets,
// wanted heat and mission triggers. Everything moves in px/s; the
// render loop calls updateWorld once per frame.
import {
  WORLD_W, WORLD_H, ROAD_X, ROAD_Y, ROAD_W, FOOT_SPEED, CAR_ACCEL,
  CAR_MAX_SPEED, CAR_BRAKE, CAR_TURN, TRAFFIC_SPEED, PED_SPEED,
  PISTOL_AMMO, PISTOL_RANGE, PISTOL_DAMAGE, PLAYER_HP, CAR_HP,
  COP_FOOT_SPEED, COP_CAR_SPEED, HELI_SPEED, WANTED_PER_STAR,
  WANTED_MAX, WANTED_DECAY_PER_S, STEAL_HEAT, SHOOT_HEAT, KILL_HEAT,
} from './config.js';
import { hitsBuilding } from './city.js';
import { currentMission } from './missions.js';

export function starsFromHeat(heat) {
  return Math.min(5, Math.ceil(heat / WANTED_PER_STAR));
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

function nearestRoadPoint(x, y) {
  // Snap a point to the closest road centreline (for spawning cars).
  let bestX = ROAD_X[0];
  let best = Infinity;
  for (const rx of ROAD_X) {
    const d = Math.abs(x - rx);
    if (d < best) { best = d; bestX = rx; }
  }
  let bestY = ROAD_Y[0];
  best = Infinity;
  for (const ry of ROAD_Y) {
    const d = Math.abs(y - ry);
    if (d < best) { best = d; bestY = ry; }
  }
  return Math.abs(x - bestX) < Math.abs(y - bestY)
    ? { x: bestX, y, vertical: true }
    : { x, y: bestY, vertical: false };
}

export function createWorld(city, rng) {
  const start = city.anchors.startSpot;
  const world = {
    time: 0,
    rng,
    city,
    player: {
      x: start.x, y: start.y, angle: -Math.PI / 2,
      hp: PLAYER_HP, ammo: PISTOL_AMMO,
      inCar: null, speed: 0, moving: false,
    },
    cars: [],
    peds: [],
    cops: [],
    heli: { x: start.x, y: start.y - 300, active: false, angle: 0 },
    bullets: [],
    particles: [],
    wantedHeat: 0,
    catchTimer: 0,
    copSpawnTimer: 0,
    trafficTimer: 0,
    crimeTimer: 0,
    maxHeatSeen: 0,
    shotsFired: 0,
    carsStolen: 0,
  };

  // Traffic: 22 cars spread over the road grid.
  const carColors = ['#cbd5e0', '#f6ad55', '#68d391', '#fc8181', '#9f7aea', '#63b3ed', '#fbd38d'];
  for (let i = 0; i < 22; i++) {
    const p = nearestRoadPoint(rng.range(200, WORLD_W - 200), rng.range(200, WORLD_H - 200));
    const vertical = p.vertical;
    world.cars.push({
      kind: 'traffic',
      x: p.x + (vertical ? rng.range(-18, 18) : 0),
      y: p.y + (vertical ? 0 : rng.range(-18, 18)),
      angle: vertical ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
      speed: rng.range(TRAFFIC_SPEED * 0.7, TRAFFIC_SPEED * 1.15),
      color: rng.pick(carColors),
      hp: CAR_HP,
      vertical,
      wobble: rng.range(0, Math.PI * 2),
    });
  }

  // Pedestrians: 28 people wandering the sidewalks.
  for (let i = 0; i < 28; i++) {
    const p = nearestRoadPoint(rng.range(200, WORLD_W - 200), rng.range(200, WORLD_H - 200));
    world.peds.push({
      x: p.x + rng.range(-70, 70),
      y: p.y + rng.range(-70, 70),
      angle: rng.range(0, Math.PI * 2),
      speed: rng.range(PED_SPEED * 0.7, PED_SPEED * 1.3),
      tx: p.x, ty: p.y,
      flee: 0,
    });
  }

  return world;
}

function moveWithBuildings(world, e, nx, ny, radius) {
  // Axis-separated movement so the player slides along walls.
  const b = world.city;
  if (!hitsBuilding(b, nx, e.y, radius)) e.x = nx;
  if (!hitsBuilding(b, e.x, ny, radius)) e.y = ny;
  e.x = clamp(e.x, 30, WORLD_W - 30);
  e.y = clamp(e.y, 30, WORLD_H - 30);
}

function addHeat(world, amount) {
  world.wantedHeat = clamp(world.wantedHeat + amount, 0, WANTED_MAX);
  world.maxHeatSeen = Math.max(world.maxHeatSeen, world.wantedHeat);
  world.crimeTimer = 3;
}

function nearestCar(world, x, y, maxD, kinds) {
  let best = null;
  let bestD = maxD;
  for (const c of world.cars) {
    if (kinds && !kinds.includes(c.kind)) continue;
    const d = dist(x, y, c.x, c.y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function spawnCop(world, nearPlayer) {
  const p = world.player;
  const ang = world.rng.range(0, Math.PI * 2);
  const r = nearPlayer ? world.rng.range(500, 700) : world.rng.range(700, 900);
  const x = clamp(p.x + Math.cos(ang) * r, 60, WORLD_W - 60);
  const y = clamp(p.y + Math.sin(ang) * r, 60, WORLD_H - 60);
  world.cops.push({ x, y, hp: 60, angle: 0, shootTimer: world.rng.range(0.5, 1.5) });
}

function spawnCopCar(world) {
  const p = world.player;
  const spot = nearestRoadPoint(p.x + world.rng.range(-700, 700), p.y + world.rng.range(-700, 700));
  world.cars.push({
    kind: 'police',
    x: spot.x, y: spot.y,
    angle: angleTo(spot.x, spot.y, p.x, p.y),
    speed: COP_CAR_SPEED,
    color: '#2b6cb0',
    hp: CAR_HP,
    vertical: spot.vertical,
    siren: true,
  });
}

function burst(world, x, y, color, n, speed) {
  for (let i = 0; i < n; i++) {
    const a = world.rng.range(0, Math.PI * 2);
    const s = world.rng.range(speed * 0.3, speed);
    world.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: world.rng.range(0.25, 0.6), max: 0.6, color });
  }
}

export function updateWorld(world, input, dt, missionState, sfx) {
  const p = world.player;
  const city = world.city;
  world.time += dt;
  world.crimeTimer = Math.max(0, world.crimeTimer - dt);
  const stars = starsFromHeat(world.wantedHeat);
  const mission = currentMission(missionState);
  let status = 'playing';

  // --- Wanted decay: heat cools only while no police is close and the
  // helicopter is not watching. That is how you "lose the cops".
  const policeNear = world.cops.some((c) => dist(c.x, c.y, p.x, p.y) < 600)
    || world.cars.some((c) => c.kind === 'police' && dist(c.x, c.y, p.x, p.y) < 650)
    || world.heli.active;
  if (!policeNear && world.crimeTimer <= 0 && world.wantedHeat > 0) {
    world.wantedHeat = Math.max(0, world.wantedHeat - WANTED_DECAY_PER_S * dt);
  }

  // --- Police presence scales with stars.
  world.copSpawnTimer -= dt;
  const wantFootCops = stars >= 1 ? Math.min(2 + stars, 6) : 0;
  const wantCopCars = stars >= 2 ? Math.min(stars - 1, 3) : 0;
  if (world.cops.length < wantFootCops && world.copSpawnTimer <= 0) {
    spawnCop(world, true);
    world.copSpawnTimer = 1.2;
  }
  const copCars = world.cars.filter((c) => c.kind === 'police').length;
  if (copCars < wantCopCars && world.copSpawnTimer <= 0) {
    spawnCopCar(world);
    world.copSpawnTimer = 2.0;
  }
  world.heli.active = stars >= 3;
  if (world.heli.active) {
    const ha = angleTo(world.heli.x, world.heli.y, p.x, p.y);
    world.heli.x += Math.cos(ha) * HELI_SPEED * dt;
    world.heli.y += Math.sin(ha) * HELI_SPEED * dt;
    world.heli.angle = ha;
  }
  if (sfx) sfx.siren(stars >= 1);

  // --- Player: on foot.
  if (!p.inCar) {
    const ax = input.axis();
    const moving = ax.x !== 0 || ax.y !== 0;
    p.moving = moving;
    if (moving) {
      const len = Math.hypot(ax.x, ax.y) || 1;
      const nx = p.x + (ax.x / len) * FOOT_SPEED * dt;
      const ny = p.y + (ax.y / len) * FOOT_SPEED * dt;
      moveWithBuildings(world, p, nx, ny, 14);
      p.angle = Math.atan2(ax.y, ax.x);
    }
    // Aim with the mouse, shoot with click / Space.
    const aim = input.mouse;
    p.aimAngle = Math.atan2(aim.y - 300, aim.x - 400);
    const wantShoot = input.mouse.clicked || input.keys.has(' ');
    if (wantShoot && p.ammo > 0) {
      p.ammo -= 1;
      world.shotsFired += 1;
      const a = p.aimAngle;
      world.bullets.push({
        x: p.x + Math.cos(a) * 22, y: p.y + Math.sin(a) * 22,
        vx: Math.cos(a) * 900, vy: Math.sin(a) * 900,
        life: PISTOL_RANGE / 900, fromPlayer: true,
      });
      addHeat(world, SHOOT_HEAT * 0.4);
      burst(world, p.x + Math.cos(a) * 26, p.y + Math.sin(a) * 26, '#f6e05e', 3, 120);
      if (sfx) sfx.shoot();
    }
    if (input.consumePressed('r')) {
      p.ammo = PISTOL_AMMO;
    }
    // Steal / enter the nearest car with E.
    if (input.consumePressed('e')) {
      const car = nearestCar(world, p.x, p.y, 70, ['traffic']);
      if (car) {
        car.kind = 'player';
        p.inCar = car;
        p.speed = 0;
        world.carsStolen += 1;
        addHeat(world, STEAL_HEAT);
        burst(world, p.x, p.y, '#e53e3e', 6, 140);
        if (sfx) sfx.door();
      }
    }
  } else {
    // --- Player: driving.
    const car = p.inCar;
    const ax = input.axis();
    const forward = ax.y < 0;
    const reverse = ax.y > 0;
    if (forward) p.speed = Math.min(CAR_MAX_SPEED, p.speed + CAR_ACCEL * dt);
    else if (reverse) p.speed = Math.max(-CAR_MAX_SPEED * 0.45, p.speed - CAR_ACCEL * 0.8 * dt);
    else p.speed *= Math.pow(0.4, dt);
    if (Math.abs(p.speed) > 20) {
      const steer = (ax.x || 0) * CAR_TURN * (p.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(p.speed) / 200);
      car.angle += steer * dt;
    }
    const nx = car.x + Math.cos(car.angle) * p.speed * dt;
    const ny = car.y + Math.sin(car.angle) * p.speed * dt;
    const hit = hitsBuilding(city, nx, ny, 16);
    if (hit) {
      p.speed *= -0.25;
      car.hp -= 8;
      burst(world, nx, ny, '#a0aec0', 8, 200);
      if (sfx) sfx.crash();
    } else {
      car.x = clamp(nx, 30, WORLD_W - 30);
      car.y = clamp(ny, 30, WORLD_H - 30);
    }
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.moving = Math.abs(p.speed) > 30;
    if (input.consumePressed('e')) {
      car.kind = 'traffic';
      car.speed = TRAFFIC_SPEED;
      p.inCar = null;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 30;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 30;
      p.speed = 0;
      if (sfx) sfx.door();
    }
    // Ramming a police car or traffic at speed is a crime.
    for (const other of world.cars) {
      if (other === car) continue;
      if (dist(car.x, car.y, other.x, other.y) < 34 && Math.abs(p.speed) > 260) {
        other.hp -= 25;
        p.speed *= 0.5;
        burst(world, other.x, other.y, '#f6ad55', 8, 220);
        if (other.kind === 'police') addHeat(world, 10);
        if (sfx) sfx.crash();
      }
    }
    if (car.hp <= 0) {
      burst(world, car.x, car.y, '#1a202c', 26, 320);
      world.cars = world.cars.filter((c) => c !== car);
      p.inCar = null;
      p.hp = Math.max(10, p.hp - 25);
      if (sfx) sfx.crash();
    }
  }

  // --- Traffic cars cruise their roads; police cars hunt the player.
  for (const car of [...world.cars]) {
    if (car.kind === 'player') continue;
    if (car.kind === 'police') {
      const a = angleTo(car.x, car.y, p.x, p.y);
      let da = a - car.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      car.angle += clamp(da, -2.2 * dt, 2.2 * dt);
      const sp = COP_CAR_SPEED;
      const nx = car.x + Math.cos(car.angle) * sp * dt;
      const ny = car.y + Math.sin(car.angle) * sp * dt;
      if (!hitsBuilding(city, nx, ny, 16)) {
        car.x = clamp(nx, 30, WORLD_W - 30);
        car.y = clamp(ny, 30, WORLD_H - 30);
      }
      // A police car ramming the player's car hurts it.
      if (p.inCar && dist(car.x, car.y, p.x, p.y) < 40) {
        p.inCar.hp -= 30 * dt;
        p.speed *= 0.98;
      }
      // A police car touching the player on foot ends the run.
      if (!p.inCar && dist(car.x, car.y, p.x, p.y) < 34) {
        status = 'busted';
      }
      continue;
    }
    // Ordinary traffic: follow the road, turn at intersections sometimes.
    const step = car.speed * dt;
    let nx = car.x + Math.cos(car.angle) * step;
    let ny = car.y + Math.sin(car.angle) * step;
    if (nx < 60 || nx > WORLD_W - 60 || ny < 60 || ny > WORLD_H - 60) {
      car.angle += Math.PI;
      nx = car.x;
      ny = car.y;
    }
    // At an intersection, sometimes switch to the crossing road.
    const nearX = ROAD_X.some((rx) => Math.abs(car.x - rx) < 30);
    const nearY = ROAD_Y.some((ry) => Math.abs(car.y - ry) < 30);
    if (nearX && nearY && world.rng.chance(0.02)) {
      car.angle += world.rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    }
    if (!hitsBuilding(city, nx, ny, 14)) {
      car.x = clamp(nx, 30, WORLD_W - 30);
      car.y = clamp(ny, 30, WORLD_H - 30);
    } else {
      car.angle += Math.PI / 2;
    }
    car.wobble += dt;
  }

  // Keep traffic topped up (cars that get wrecked or stolen respawn).
  world.trafficTimer -= dt;
  const trafficCount = world.cars.filter((c) => c.kind === 'traffic').length;
  if (trafficCount < 18 && world.trafficTimer <= 0) {
    const spot = nearestRoadPoint(world.rng.range(200, WORLD_W - 200), world.rng.range(200, WORLD_H - 200));
    if (dist(spot.x, spot.y, p.x, p.y) > 500) {
      world.cars.push({
        kind: 'traffic',
        x: spot.x, y: spot.y,
        angle: world.rng.chance(0.5) ? 0 : Math.PI / 2,
        speed: world.rng.range(TRAFFIC_SPEED * 0.7, TRAFFIC_SPEED * 1.15),
        color: '#a0aec0',
        hp: CAR_HP,
        vertical: spot.vertical,
        wobble: 0,
      });
    }
    world.trafficTimer = 1.5;
  }

  // --- Pedestrians wander, and flee from gunfire.
  for (const ped of world.peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      const a = angleTo(p.x, p.y, p.x, p.y) + Math.PI;
      moveWithBuildings(world, ped, ped.x + Math.cos(a) * PED_SPEED * 1.8 * dt, ped.y + Math.sin(a) * PED_SPEED * 1.8 * dt, 8);
      continue;
    }
    const d = dist(ped.x, ped.y, ped.tx, ped.ty);
    if (d < 12) {
      const t = nearestRoadPoint(world.rng.range(200, WORLD_W - 200), world.rng.range(200, WORLD_H - 200));
      ped.tx = t.x + world.rng.range(-70, 70);
      ped.ty = t.y + world.rng.range(-70, 70);
    } else {
      const a = angleTo(ped.x, ped.y, ped.tx, ped.ty);
      ped.angle = a;
      moveWithBuildings(world, ped, ped.x + Math.cos(a) * ped.speed * dt, ped.y + Math.sin(a) * ped.speed * dt, 8);
    }
  }

  // --- Foot cops chase and shoot; touching the player on foot busts them.
  for (const cop of [...world.cops]) {
    const d = dist(cop.x, cop.y, p.x, p.y);
    const a = angleTo(cop.x, cop.y, p.x, p.y);
    cop.angle = a;
    const nx = cop.x + Math.cos(a) * COP_FOOT_SPEED * dt;
    const ny = cop.y + Math.sin(a) * COP_FOOT_SPEED * dt;
    if (!hitsBuilding(city, nx, ny, 12)) {
      cop.x = clamp(nx, 30, WORLD_W - 30);
      cop.y = clamp(ny, 30, WORLD_H - 30);
    }
    cop.shootTimer -= dt;
    if (d < 380 && cop.shootTimer <= 0) {
      cop.shootTimer = world.rng.range(1.1, 1.9);
      const spread = world.rng.range(-0.12, 0.12);
      world.bullets.push({
        x: cop.x, y: cop.y,
        vx: Math.cos(a + spread) * 520, vy: Math.sin(a + spread) * 520,
        life: 380 / 520, fromPlayer: false,
      });
      if (sfx) sfx.shoot();
    }
    if (!p.inCar && d < 30) {
      world.catchTimer += dt;
      if (world.catchTimer > 1.2) status = 'busted';
    }
  }
  if (!world.cops.some((c) => dist(c.x, c.y, p.x, p.y) < 30)) world.catchTimer = 0;
  // Cops give up when the heat is gone.
  if (stars === 0) {
    world.cops = [];
    world.cars = world.cars.filter((c) => c.kind !== 'police');
  }

  // --- Bullets fly, hit buildings, cars, cops and the player.
  for (const b of [...world.bullets]) {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || b.x < 0 || b.x > WORLD_W || b.y < 0 || b.y > WORLD_H;
    if (!dead && hitsBuilding(city, b.x, b.y, 0)) {
      burst(world, b.x, b.y, '#a0aec0', 3, 90);
      dead = true;
    }
    if (!dead) {
      if (b.fromPlayer) {
        for (const cop of [...world.cops]) {
          if (dist(b.x, b.y, cop.x, cop.y) < 16) {
            cop.hp -= PISTOL_DAMAGE;
            burst(world, cop.x, cop.y, '#e53e3e', 6, 160);
            if (sfx) sfx.hit();
            if (cop.hp <= 0) {
              world.cops = world.cops.filter((c) => c !== cop);
              addHeat(world, KILL_HEAT * 0.5);
            }
            dead = true;
            break;
          }
        }
        if (!dead) {
          for (const car of [...world.cars]) {
            if (car.kind === 'player') continue;
            if (dist(b.x, b.y, car.x, car.y) < 20) {
              car.hp -= PISTOL_DAMAGE;
              burst(world, b.x, b.y, '#f6ad55', 5, 150);
              if (car.hp <= 0) {
                burst(world, car.x, car.y, '#1a202c', 20, 280);
                world.cars = world.cars.filter((c) => c !== car);
                addHeat(world, KILL_HEAT * 0.5);
              }
              dead = true;
              break;
            }
          }
        }
        if (!dead) {
          for (const ped of world.peds) {
            if (dist(b.x, b.y, ped.x, ped.y) < 12) {
              ped.flee = 3;
              addHeat(world, 8);
              dead = true;
              break;
            }
          }
        }
      } else if (dist(b.x, b.y, p.x, p.y) < (p.inCar ? 20 : 14)) {
        p.hp -= 12;
        burst(world, p.x, p.y, '#e53e3e', 4, 130);
        dead = true;
      }
    }
    if (dead) world.bullets = world.bullets.filter((x) => x !== b);
  }
  if (p.hp <= 0) status = 'wasted';

  // --- Particles fade.
  for (const pt of [...world.particles]) {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) world.particles = world.particles.filter((x) => x !== pt);
  }

  // --- Mission triggers.
  let missionDone = false;
  if (mission && status === 'playing') {
    const anchor = city.anchors[mission.anchor];
    const d = dist(p.x, p.y, anchor.x, anchor.y);
    if (d < 90) {
      const okCar = mission.id === 'wheels' ? !!p.inCar : true;
      const okFoot = mission.needsOnFoot ? !p.inCar : true;
      const okEscape = mission.needsEscape ? world.wantedHeat < WANTED_PER_STAR : true;
      if (okCar && okFoot && okEscape) missionDone = true;
    }
    missionState.maxHeat = Math.max(missionState.maxHeat, world.wantedHeat);
  }

  return { status, missionDone, stars };
}
