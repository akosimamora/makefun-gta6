// The screenshot scenes behind ?shot=chase|city|heist|start. Each one sets the
// world to a real, playable state — a chase, a street, a heist, the title —
// and returns the screen to draw over it. The frame is what the game really
// looks like in that state, and the same seed always gives the same frame.
// The cover is the chase: a wanted level, police cars, a helicopter, the
// minimap and a mission objective, all in one picture.

import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { addWanted, enterCar } from './world.js';

// A police car placed by hand for a shot: same shape as the world's cars.
function policeCar(id, x, y, angle, speed) {
  return {
    id, x, y, angle, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    speed, kind: 'police', color: '#2e4a7a', isPolice: true,
    health: 100, isPlayer: false, isTraffic: false, driver: false,
    stuck: 0, smoke: 0, wrecked: false,
  };
}

// Put Mara in the red sports car by the garage, without the theft wanted bump.
function putMaraInSportsCar(world) {
  const car = world.cars.find((c) => c.id === 1000);
  if (!car) return null;
  car.driver = false;
  enterCar(world, car);
  return car;
}

// The wanted level, set exactly, with the helicopter to match.
function setWanted(world, stars) {
  world.wanted.stars = stars;
  world.wanted.timer = 0;
  world.wanted.cooling = false;
  world.stats.maxWanted = Math.max(world.stats.maxWanted, stars);
  if (stars >= 3) {
    world.heli.active = true;
    world.heli.x = world.player.x;
    world.heli.y = world.player.y - 420;
  }
}

function setMission(world, index, step, objective, target) {
  world.mission.index = index;
  world.mission.step = step;
  world.mission.started = true;
  world.mission.objective = objective;
  world.mission.target = target;
}

/**
 * Set `world` to the named scene and return the screen to draw and the best
 * cash to show. Any other name is the title.
 */
export function stageShot(name, world) {
  const s = world.city.spots;
  if (name === 'chase') {
    // The cover: Mara in the sports car, fleeing right along the Neon Mile,
    // three stars, two police cars on her tail on the same road, the
    // helicopter ahead of her, and the escape objective on the HUD.
    const car = putMaraInSportsCar(world);
    if (car) {
      car.x = 1400;
      car.y = 1600;
      car.angle = 0;
      car.speed = 420;
      world.player.x = car.x;
      world.player.y = car.y;
      world.player.angle = car.angle;
      world.player.speed = 420;
    }
    setWanted(world, 3);
    world.heli.x = 1600;
    world.heli.y = 1330;
    world.cars.push(policeCar(3001, 1150, 1600, 0, 430));
    world.cars.push(policeCar(3002, 1050, 1600, 0, 400));
    setMission(world, 3, 2, 'The Big One: Escape to the safehouse — lose the cops!', { x: s.safehouse.x, y: s.safehouse.y, label: 'Safehouse' });
    world.camera.x = world.player.x;
    world.camera.y = world.player.y;
    world.camera.zoom = 0.9;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'city') {
    // Mara on foot in Palmera Heights, traffic and pedestrians around her.
    world.player.x = 1400;
    world.player.y = 800;
    world.player.angle = 0;
    world.player.onFoot = true;
    setWanted(world, 0);
    setMission(world, 0, 1, 'Wheels: Drive the car to the Marina pickup', { x: s.marinaPickup.x, y: s.marinaPickup.y, label: 'Marina' });
    world.camera.x = world.player.x;
    world.camera.y = world.player.y;
    world.camera.zoom = 1;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'heist') {
    // Mara on foot outside the Golden Palm, two stars, a police car closing in.
    world.player.x = 1400;
    world.player.y = 1990;
    world.player.angle = -Math.PI / 2;
    world.player.onFoot = true;
    setWanted(world, 2);
    world.cars.push(policeCar(3003, 1200, 1800, 0, 380));
    setMission(world, 3, 1, 'The Big One: Grab the vault cash', { x: s.neonCasino.x, y: s.neonCasino.y, label: 'Golden Palm' });
    world.camera.x = world.player.x;
    world.camera.y = world.player.y;
    world.camera.zoom = 1;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  // The title screen, over the city.
  world.camera.x = 1600;
  world.camera.y = 1200;
  world.camera.zoom = 0.55;
  return { screen: SCREEN_TITLE, best: 0 };
}
