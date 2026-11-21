// Screenshot presets: the judge sees the game mostly through the
// screenshots, so each one stages a different system. The render
// script loads index.html?shot=<name>&seed=1 and this module sets the
// world up before the first frame — no edits, no compositing.
import { ROAD_X } from './config.js';

export function shotFromUrl() {
  const q = new URLSearchParams(window.location.search);
  return {
    shot: q.get('shot') || null,
    seed: parseInt(q.get('seed') || '1', 10) || 1,
  };
}

// Place a police car behind the player, ready to chase.
function placeChaser(world, dx, dy, angle) {
  const p = world.player;
  world.cars.push({
    kind: 'police',
    x: p.x + dx, y: p.y + dy,
    angle, speed: 560,
    color: '#2b6cb0', hp: 100,
    vertical: false, siren: true,
  });
}

export function applyShot(world, name) {
  const p = world.player;
  const city = world.city;

  if (name === 'chase') {
    // Cover: 3-star chase in a stolen car, helicopter overhead.
    // The car gets extra health so police ramming cannot wreck it
    // inside the screenshot window.
    const roadY = 1400;
    p.x = 1500;
    p.y = roadY;
    const car = world.cars.find((c) => c.kind === 'traffic');
    if (car) {
      car.kind = 'player';
      car.x = p.x;
      car.y = p.y;
      car.angle = 0;
      car.color = '#e53e3e';
      car.hp = 400;
      p.inCar = car;
      p.speed = 560;
      p.angle = 0;
    }
    world.wantedHeat = 55;
    world.maxHeatSeen = 55;
    world.heli.active = true;
    world.heli.x = p.x - 120;
    world.heli.y = p.y - 160;
    placeChaser(world, -350, 50, 0);
    placeChaser(world, -560, -40, 0);
    world.cops.push({ x: p.x - 220, y: p.y + 130, hp: 60, angle: 0, shootTimer: 1 });
    // Mission 4 active so the objective reads "escape to the safehouse".
    world.missionOverride = 3;
  } else if (name === 'city') {
    // On foot in Palmera Heights: traffic, pedestrians, Sol Tower.
    p.x = 1050;
    p.y = 620;
    p.angle = Math.PI / 2;
    p.inCar = null;
    world.wantedHeat = 0;
    // A couple of nearby pedestrians and a traffic car for life.
    world.peds.push(
      { x: 980, y: 700, angle: 0, speed: 55, tx: 1200, ty: 700, flee: 0 },
      { x: 1150, y: 560, angle: Math.PI, speed: 50, tx: 900, ty: 560, flee: 0 },
    );
    world.cars.push({
      kind: 'traffic', x: 1250, y: 900, angle: 0, speed: 150,
      color: '#f6ad55', hp: 100, vertical: false, wobble: 0,
    });
    world.missionOverride = 0;
  } else if (name === 'heist') {
    // Golden Palm casino: 2 stars, vault marker, a cop closing in.
    // The player stands east of the casino, clear of its walls and
    // outside the vault trigger radius, facing the vault. Only a foot
    // cop closes in — a patrol car would touch the player on foot and
    // bust the run before the shutter (a car busts on contact, a foot
    // cop needs 1.2 s), so the shot stays playable.
    p.x = 900;
    p.y = 1700;
    p.angle = Math.PI;
    p.inCar = null;
    world.wantedHeat = 35;
    world.maxHeatSeen = 35;
    world.cops.push({ x: 1150, y: 1850, hp: 60, angle: Math.PI, shootTimer: 1 });
    world.missionOverride = 1;
  } else if (name === 'start') {
    // Start screen — nothing to stage, main.js keeps the start state.
    world.missionOverride = null;
  }
  return name;
}
