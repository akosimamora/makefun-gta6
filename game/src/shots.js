// Staged scenes for screenshots: freeze the action so the frame is stable.
import { addWanted } from './world.js';

// A police chase at the Sol Tower plaza: player in a car, two patrol cars,
// a foot cop, the helicopter and its spotlight, three wanted stars.
export function stageChase(world) {
  const p = world.player;
  const car = world.cars.find((c) => !c.traffic) || world.cars[0];
  car.traffic = false;
  car.x = 1500; car.y = 620; car.angle = 0; car.speed = 320;
  p.car = car;
  p.onFoot = false;
  p.x = car.x; p.y = car.y; p.angle = car.angle; p.speed = car.speed;
  p.wanted = 3;
  world.wantedPeak = 3;
  world.copCars.length = 0;
  world.copCars.push(
    { x: 1420, y: 560, angle: 0.4, speed: 0, color: '#1a1a2e' },
    { x: 1620, y: 690, angle: Math.PI, speed: 0, color: '#1a1a2e' },
  );
  world.cops.length = 0;
  world.cops.push({ x: 1560, y: 580, angle: 0, speed: 0 });
  world.heli.active = true;
  world.heli.x = 1500; world.heli.y = 560;
  return { x: 1500 - 640, y: 620 - 360 };
}

// On foot in Palmera Heights: beach, Sol Tower in the distance, traffic
// and pedestrians around, minimap visible.
export function stageCity(world) {
  const p = world.player;
  p.onFoot = true; p.car = null; p.speed = 0;
  p.x = 600; p.y = 800; p.angle = 0;
  p.wanted = 0;
  world.cops.length = 0;
  world.copCars.length = 0;
  world.heli.active = false;
  return { x: 600 - 640, y: 800 - 360 };
}

// The Golden Palm heist: player at the vault beacon, two foot cops closing
// in, two wanted stars, HP 88 and 10 rounds left.
export function stageHeist(world) {
  const p = world.player;
  p.onFoot = true; p.car = null; p.speed = 0;
  p.x = 700; p.y = 1180; p.angle = Math.PI / 2;
  p.hp = 88; p.ammo = 10;
  p.wanted = 2;
  world.wantedPeak = 2;
  world.cops.length = 0;
  world.cops.push(
    { x: 640, y: 1120, angle: 0.6, speed: 0 },
    { x: 780, y: 1130, angle: 2.4, speed: 0 },
  );
  world.copCars.length = 0;
  world.heli.active = false;
  return { x: 700 - 640, y: 1250 - 360 };
}

// The title screen needs no world staging; main.js draws it.
export function stageStart(world) {
  const p = world.player;
  p.onFoot = true; p.car = null;
  p.x = 600; p.y = 900;
  p.wanted = 0;
  world.cops.length = 0;
  world.copCars.length = 0;
  world.heli.active = false;
  return { x: 600 - 640, y: 900 - 360 };
}
