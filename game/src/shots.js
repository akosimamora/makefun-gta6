// Staged scenes for the four screenshots. Each one puts the player, the
// police and the traffic exactly where the shot needs them, then the game
// renders one frame. Only foot cops are used for the heist shot — patrol
// cars touch the player and end the scene BUSTED before the capture.
import { createWorld } from './world.js';

function placeCar(world, x, y, angle, speed, color) {
  const car = {
    id: world.cars.length, x, y, angle, speed, color,
    vertical: false, hp: 100, traffic: false, stolen: false,
  };
  world.cars.push(car);
  return car;
}

export function stageShot(name) {
  const world = createWorld(20261121);
  world.phase = 'play';
  const p = world.player;
  if (name === 'chase') {
    const car = placeCar(world, 1280, 1200, 0, 168, '#c94f4f');
    p.inCar = car;
    p.x = car.x;
    p.y = car.y;
    p.angle = 0;
    p.speed = 168;
    car.speed = 168;
    world.wanted = 3;
    world.wantedTimer = 14000;
    world.heli = { x: 1120, y: 1000, angle: 0.6, timer: 2 };
    world.cops.push({ kind: 'car', x: 1080, y: 1200, angle: 0, speed: 150, hp: 100, color: '#2f6fe0' });
    world.cops.push({ kind: 'car', x: 1060, y: 1320, angle: 0.3, speed: 140, hp: 100, color: '#2f6fe0' });
    world.missionIndex = 2;
    world.cam.x = 1280;
    world.cam.y = 1200;
    world.message = 'The Big One: Escape to the safehouse — lose the cops!';
    world.messageTimer = 999999;
  } else if (name === 'city') {
    p.x = 800;
    p.y = 700;
    p.angle = -0.4;
    world.wanted = 0;
    world.missionIndex = 0;
    world.cam.x = 800;
    world.cam.y = 700;
    world.message = 'Wheels: Drive the car to the Marina pickup';
    world.messageTimer = 999999;
  } else if (name === 'heist') {
    p.x = 720;
    p.y = 1800;
    p.angle = -Math.PI / 2;
    world.wanted = 2;
    world.wantedTimer = 14000;
    world.cops.push({ kind: 'foot', x: 760, y: 1800, speed: 200, hp: 50 });
    world.cops.push({ kind: 'foot', x: 520, y: 1830, speed: 200, hp: 50 });
    world.missionIndex = 1;
    world.cam.x = 640;
    world.cam.y = 1850;
    world.message = 'Grab the vault cash';
    world.messageTimer = 999999;
  } else if (name === 'start') {
    world.phase = 'title';
    p.x = 640;
    p.y = 360;
    world.cam.x = 640;
    world.cam.y = 360;
  }
  return world;
}

export const SHOT_NAMES = ['chase', 'city', 'heist', 'start'];
export const SHOT_FILES = {
  chase: '1-chase.jpg',
  city: '2-city.jpg',
  heist: '3-heist.jpg',
  start: '4-start.jpg',
};
