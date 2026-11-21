// Screenshot staging: freeze a scene at a chosen moment so each capture
// shows a different system — chase, city on foot, heist, title screen.
import { CONFIG } from './config.js';

export function stageScene(world, name) {
  const p = world.player;
  world.frozen = false;
  world.cops = [];
  world.bullets = [];
  world.heli.active = false;
  world.wanted = 0;
  world.wantedPeak = 0;
  if (name === 'chase') {
    // Mara mid-escape at the Sol Tower plaza intersection, heli overhead.
    p.onFoot = false;
    p.car = world.cars[2];
    p.car.driver = true;
    p.car.parked = false;
    p.car.x = 2070;
    p.car.y = 1490;
    p.car.angle = Math.PI / 4;
    p.car.speed = 420;
    p.x = p.car.x;
    p.y = p.car.y;
    p.angle = p.car.angle;
    p.speed = 151;
    world.wanted = 3;
    world.wantedPeak = 3;
    world.cops = [
      { kind: 'car', x: 1980, y: 1420, angle: Math.PI / 4, speed: 380, color: '#2c3e50' },
      { kind: 'car', x: 2160, y: 1580, angle: -Math.PI * 0.75, speed: 360, color: '#2c3e50' },
      { kind: 'foot', x: 2010, y: 1560, speed: 210, hp: 60 },
    ];
    world.heli.active = true;
    world.heli.x = p.x + 60;
    world.heli.y = p.y - 170;
    world.heli.angle = 0.6;
    world.mission = { id: 'bigone', title: 'The Big One', giver: 'Elias Kross', text: 'The Golden Palm vault. In, out, and gone before the heli arrives.', target: { x: 2690, y: 380, district: 'golden' }, payout: 9000, needsCar: false };
    world.message = 'Elias Kross: The Golden Palm vault. In, out, and gone before the heli arrives.';
    world.messageTimer = 6;
    world.frozen = true;
  } else if (name === 'city') {
    // Mara on foot in Palmera Heights, traffic and pedestrians around.
    p.onFoot = true;
    p.car = null;
    p.x = 600;
    p.y = 900;
    p.angle = -Math.PI / 2;
    p.hp = 100;
    p.ammo = 12;
    world.mission = { id: 'courier', title: 'The Courier', giver: 'Elias Kross', text: 'Drive the package to Marina Bay. No questions, no stops.', target: { x: 1560, y: 470, district: 'marina' }, payout: 1200, needsCar: true };
    world.message = 'Elias Kross: Drive the package to Marina Bay. No questions, no stops.';
    world.messageTimer = 6;
    world.frozen = true;
  } else if (name === 'heist') {
    // Outside the Golden Palm vault, two foot cops closing in.
    p.onFoot = true;
    p.car = null;
    p.x = 2690;
    p.y = 480;
    p.angle = -Math.PI / 2;
    p.hp = 88;
    p.ammo = 10;
    world.wanted = 2;
    world.wantedPeak = 2;
    world.cops = [
      { kind: 'foot', x: 2600, y: 560, speed: 210, hp: 60 },
      { kind: 'foot', x: 2770, y: 580, speed: 210, hp: 60 },
    ];
    world.mission = { id: 'bigone', title: 'The Big One', giver: 'Elias Kross', text: 'The Golden Palm vault. In, out, and gone before the heli arrives.', target: { x: 2690, y: 380, district: 'golden' }, payout: 9000, needsCar: false };
    world.message = 'Vault beacon live — grab the cash and run.';
    world.messageTimer = 6;
    world.frozen = true;
  }
  // 'start' needs no world change: the title overlay is drawn by the loop.
}

export function unfreeze(world) {
  world.frozen = false;
}
