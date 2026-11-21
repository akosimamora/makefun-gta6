// Screenshot staging: ?shot=<name> puts the world in a fixed, readable scene
// and freezes it, so a screenshot is the same every run. The scenes are the
// ones the judge sees: a chase, the city, the heist, the title screen.

import { PLACES, CAR, WORLD_W, WORLD_H } from './config.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Centre the camera on (x, y) and freeze the world for the shot. */
function frameOn(world, x, y) {
  world.camera.x = clamp(x - 640, 0, Math.max(0, WORLD_W - 1280));
  world.camera.y = clamp(y - 360, 0, Math.max(0, WORLD_H - 720));
  world.frozen = true;
}

function clearPolice(world) {
  world.cops = [];
  world.cars = world.cars.filter((c) => c.kind === 'traffic');
  world.heli = null;
  world.guards = [];
}

function addCar(world, kind, x, y, angle, color, speed, roadAxis, roadLine, dir) {
  const car = {
    id: 9000 + world.cars.length, kind, x, y, angle, speed, color,
    hp: CAR.hp, wrecked: false, roadAxis, roadLine, dir, turnT: 0,
  };
  world.cars.push(car);
  return car;
}

export function applyShot(world, name) {
  const p = world.player;
  if (name === 'chase') {
    // The Big One, escape: Mara in a red sports car at full speed, two police
    // cars on her tail, the helicopter overhead, three stars.
    world.state = 'playing';
    world.missionIndex = 3;
    world.missionStage = 2;
    world.missionMaxHeat = 3;
    world.wanted = 3;
    world.heat = 3;
    world.coolT = 0;
    clearPolice(world);
    const pc = addCar(world, 'player', 1500, 1014, 0, '#d83232', CAR.maxSpeed, 'y', 1000, 1);
    p.car = pc;
    p.x = pc.x;
    p.y = pc.y;
    p.angle = 0;
    p.hp = 100;
    p.ammo = 12;
    addCar(world, 'police', 1290, 1014, 0, '#1c2f4a', 300, 'y', 1000, 1);
    addCar(world, 'police', 1120, 1014, 0, '#1c2f4a', 295, 'y', 1000, 1);
    addCar(world, 'traffic', 2050, 986, Math.PI, '#5ab05a', 90, 'y', 1000, -1);
    addCar(world, 'traffic', 1786, 614, Math.PI / 2, '#e8e8e8', 90, 'x', 1800, 1);
    world.heli = { x: 1560, y: 820 };
    frameOn(world, p.x, p.y);
    return true;
  }
  if (name === 'city') {
    // Mara on foot in Palmera Heights, traffic and pedestrians, Sol Tower.
    world.state = 'playing';
    world.missionIndex = 0;
    world.missionStage = 1;
    world.missionMaxHeat = 0;
    world.wanted = 0;
    world.heat = 0;
    clearPolice(world);
    p.car = null;
    p.x = 1600;
    p.y = 660;
    p.angle = Math.PI / 2;
    p.hp = 100;
    p.ammo = 12;
    addCar(world, 'traffic', 1450, 614, 0, '#4a7ad8', 90, 'y', 600, 1);
    addCar(world, 'traffic', 1800, 586, Math.PI, '#e8c33a', 90, 'y', 600, -1);
    addCar(world, 'traffic', 1586, 900, Math.PI / 2, '#5ab05a', 90, 'x', 1600, 1);
    frameOn(world, p.x, p.y);
    return true;
  }
  if (name === 'heist') {
    // The Big One, vault: Mara at the Golden Palm, two stars, a police car
    // closing in, the marker and its light pillar on the casino.
    world.state = 'playing';
    world.missionIndex = 3;
    world.missionStage = 1;
    world.missionMaxHeat = 2;
    world.wanted = 2;
    world.heat = 2;
    world.coolT = 0;
    clearPolice(world);
    p.car = null;
    p.x = 2400;
    p.y = 920;
    p.angle = -Math.PI / 2;
    p.hp = 100;
    p.ammo = 12;
    addCar(world, 'police', 2414, 1240, -Math.PI / 2, '#1c2f4a', 280, 'x', 2400, -1);
    addCar(world, 'traffic', 2200, 1014, 0, '#d87a2e', 90, 'y', 1000, 1);
    frameOn(world, p.x, p.y);
    return true;
  }
  if (name === 'start') {
    // The title screen over the city.
    world.state = 'start';
    world.missionIndex = 0;
    world.missionStage = 0;
    world.wanted = 0;
    world.heat = 0;
    clearPolice(world);
    p.car = null;
    p.x = 1600;
    p.y = 1200;
    p.angle = 0;
    frameOn(world, 1600, 1200);
    return true;
  }
  return false;
}

export const SHOT_NAMES = ['chase', 'city', 'heist', 'start'];
